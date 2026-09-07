"""Which providers get built, and in which order.

The bug this guards against is silent: a misconfigured provider does not raise
at startup, it falls through to the scripted planner and the product answers
in fixed sentences that read like a model having a dull day. These assertions
are about the decision, not about reaching either provider.
"""

from __future__ import annotations

import pytest

from app.agent.models import DEFAULT_BEDROCK_MODEL, NoModelConfigured, build_model, engine_label
from app.config import Settings

# bedrock_discover off: these assertions are about the decision, and a
# machine that happens to have AWS credentials must not make the suite
# reach out to Bedrock to run them.
BASE = {"secret_key": "x" * 48, "bedrock_discover": False}


def settings(**over) -> Settings:
    # _env_file=None so a developer's own .env cannot decide the answer: these
    # assertions are about the code's defaults, not about this machine.
    return Settings(_env_file=None, **{**BASE, **over})


# ---- Bedrock's model id ----------------------------------------------------


def test_the_default_bedrock_id_is_a_haiku_inference_profile():
    """A bare anthropic.* id is accepted by the SDK and rejected at invoke time.

    That is what made this look like an outage rather than a typo, so the
    shape of the default is worth pinning.
    """
    assert DEFAULT_BEDROCK_MODEL.startswith("us.anthropic.")
    assert "haiku" in DEFAULT_BEDROCK_MODEL, "Haiku is the model this runs on"
    assert Settings.model_fields["bedrock_model_id"].default == DEFAULT_BEDROCK_MODEL


# ---- Which providers are considered ---------------------------------------


def test_scripted_mode_considers_neither(monkeypatch):
    s = settings(agent_engine="scripted", openai_api_key="sk-test")
    assert s.use_model is False
    assert engine_label(s) == "scripted"


def test_auto_with_nothing_configured_considers_neither():
    """A laptop with no credentials must not wait on an instance-metadata timeout."""
    s = settings(agent_engine="auto")
    assert s.use_bedrock_model is False
    assert s.use_openai_model is False
    assert s.use_model is False


def test_auto_notices_an_openai_key_on_its_own():
    """OpenAI needs no AWS anything, so a key alone is enough to try a model."""
    s = settings(agent_engine="auto", openai_api_key="sk-test")
    assert s.use_openai_model is True
    assert s.use_bedrock_model is False
    assert s.use_model is True


def test_forced_mode_tries_bedrock_without_explicit_keys():
    """Under an IAM task role there are no keys to find, which is the whole point."""
    s = settings(agent_engine="model")
    assert s.use_bedrock_model is True
    assert s.model_required is True


def test_bedrock_is_still_accepted_as_the_name_for_forced_mode():
    """A deployment already carrying AGENT_ENGINE=bedrock must keep working."""
    s = settings(agent_engine="bedrock")
    assert s.model_forced is True
    assert s.use_bedrock_model is True


# ---- What build_model returns ---------------------------------------------


def test_no_provider_is_an_explicit_error_not_a_silent_none():
    with pytest.raises(NoModelConfigured):
        build_model(settings(agent_engine="auto"))


def test_one_provider_is_returned_bare():
    """No router when there is nothing to route between."""
    model = build_model(settings(agent_engine="auto", openai_api_key="sk-test"))
    assert type(model).__name__ == "OpenAIModel"


def test_the_candidates_are_tried_in_declaration_order():
    s = settings(agent_engine="model", openai_api_key="sk-test")
    model = build_model(s)
    assert type(model).__name__ == "ModelRouter"
    assert [c.name for c in model.candidates] == ["bedrock", "bedrock-2", "openai"]
    assert engine_label(s) == "bedrock+openai"


def test_the_second_bedrock_candidate_needs_no_extra_credentials():
    """It is the one fallback that works without waiting on a key from
    elsewhere, which is the whole reason it is there."""
    s = settings(agent_engine="model")
    model = build_model(s)
    assert [c.name for c in model.candidates] == ["bedrock", "bedrock-2"]


def test_the_cheap_fallback_can_be_switched_off():
    s = settings(agent_engine="model", bedrock_fallback_model_id="")
    assert type(build_model(s)).__name__ == "BedrockModel"


def test_a_fallback_equal_to_the_primary_is_not_listed_twice():
    s = settings(agent_engine="model",
                 bedrock_model_id="same", bedrock_fallback_model_id="same")
    assert type(build_model(s)).__name__ == "BedrockModel"


def test_the_openai_model_id_is_configurable():
    """The exact id is a moving target; being able to change it without a
    deploy of new code is the point of it being a setting."""
    model = build_model(settings(agent_engine="auto", openai_api_key="sk-test",
                                 openai_model="something-else"))
    assert model.config["model_id"] == "something-else"


# ---- DeepSeek --------------------------------------------------------------
#
# Reached through its OpenAI-compatible endpoint, so the thing worth pinning is
# that it actually points somewhere else. A missing base_url would send a
# DeepSeek key to OpenAI, which fails in a way that reads like a bad key.


def test_deepseek_targets_its_own_endpoint():
    model = build_model(settings(agent_engine="auto", deepseek_api_key="sk-test"))
    assert type(model).__name__ == "OpenAIModel"
    assert model.client_args["base_url"] == "https://api.deepseek.com"
    assert model.client_args["api_key"] == "sk-test"


def test_deepseek_defaults_to_the_moving_alias():
    """A version string goes stale and then fails at call time; the alias does
    not, and DeepSeek keeps it pointed at their current model."""
    model = build_model(settings(agent_engine="auto", deepseek_api_key="sk-test"))
    assert model.config["model_id"] == "deepseek-chat"


def test_deepseek_uses_the_older_max_tokens_parameter():
    """DeepSeek follows the original OpenAI shape and rejects the newer name."""
    model = build_model(settings(agent_engine="auto", deepseek_api_key="sk-test"))
    assert "max_tokens" in model.config["params"]
    assert "max_completion_tokens" not in model.config["params"]


def test_a_key_alone_is_enough_to_try_a_model():
    s = settings(agent_engine="auto", deepseek_api_key="sk-test")
    assert s.use_deepseek_model is True
    assert s.use_model is True


def test_no_key_means_deepseek_is_never_called():
    assert settings(agent_engine="model").use_deepseek_model is False


# ---- The order providers are tried in --------------------------------------


def test_bedrock_leads_by_default():
    """It runs inside this account's own AWS, so nothing about a pregnancy
    leaves it. Putting a third party first should take a deliberate setting."""
    s = settings(agent_engine="model", deepseek_api_key="sk-test")
    assert [c.name for c in build_model(s).candidates] == [
        "bedrock", "bedrock-2", "deepseek",
    ]


def test_the_order_can_be_reversed():
    s = settings(agent_engine="model", deepseek_api_key="sk-test",
                 model_priority="deepseek,bedrock")
    assert [c.name for c in build_model(s).candidates] == [
        "deepseek", "bedrock", "bedrock-2",
    ]
    assert engine_label(s) == "deepseek+bedrock"


def test_a_provider_left_out_of_the_setting_still_runs_last():
    """A typo in the order must not silently disable a configured provider."""
    s = settings(agent_engine="model", deepseek_api_key="sk-test",
                 openai_api_key="sk-o", model_priority="deepseek")
    assert [c.name for c in build_model(s).candidates] == [
        "deepseek", "bedrock", "bedrock-2", "openai",
    ]


def test_an_unknown_name_in_the_order_is_ignored():
    s = settings(agent_engine="model", model_priority="nonsense,bedrock")
    assert s.provider_order[0] == "bedrock"


def test_health_lists_them_in_the_configured_order():
    from app.agent.models import describe

    s = settings(agent_engine="model", deepseek_api_key="sk-test",
                 model_priority="deepseek,bedrock")
    assert describe(s)[0] == "deepseek-chat"
