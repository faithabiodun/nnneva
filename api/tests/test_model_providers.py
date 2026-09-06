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

BASE = {"secret_key": "x" * 48}


def settings(**over) -> Settings:
    # _env_file=None so a developer's own .env cannot decide the answer: these
    # assertions are about the code's defaults, not about this machine.
    return Settings(_env_file=None, **{**BASE, **over})


# ---- Bedrock's model id ----------------------------------------------------


def test_the_default_bedrock_id_is_an_inference_profile():
    """A bare anthropic.* id is accepted by the SDK and rejected at invoke time.

    That is what made this look like an outage rather than a typo, so the
    shape of the default is worth pinning.
    """
    assert DEFAULT_BEDROCK_MODEL.startswith("us.anthropic.")
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


def test_two_providers_become_a_router_with_bedrock_first():
    s = settings(agent_engine="model", openai_api_key="sk-test")
    model = build_model(s)
    assert type(model).__name__ == "ModelRouter"
    assert [c.name for c in model.candidates] == ["bedrock", "openai"]
    assert engine_label(s) == "bedrock+openai"


def test_the_openai_model_id_is_configurable():
    """The exact id is a moving target; being able to change it without a
    deploy of new code is the point of it being a setting."""
    model = build_model(settings(agent_engine="auto", openai_api_key="sk-test",
                                 openai_model="something-else"))
    assert model.config["model_id"] == "something-else"
