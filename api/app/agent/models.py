"""Which model the agent talks to.

Two providers, in preference order: Bedrock first because the whole product is
meant to run on AWS, OpenAI behind it so a Bedrock outage — or a model that is
simply not enabled on the account — does not drop the user back to the scripted
planner and generic-sounding answers.

Strands does the failing over: a ModelRouter with a fallback strategy tries the
healthiest candidate that has not been tried since the last success, so a
provider that keeps failing sinks below one that works instead of being retried
first every time.

Both are optional. One configured provider means no router at all, which keeps
the common single-provider case free of indirection.
"""

from __future__ import annotations

import logging

from app.agent.bedrock_catalog import resolve

log = logging.getLogger("nnneva.agent")

# Bedrock serves Anthropic models on demand only through an inference profile,
# so the id carries a region prefix. A bare `anthropic.claude-...` id is
# accepted by the SDK and then rejected at invoke time, which is how this was
# broken for so long: the failure looked like a network problem, not a typo.
# Both verified against a real account with a Converse call carrying the
# system prompt and the tool schemas — not picked from a catalogue listing,
# which lists plenty this account cannot invoke.
#
# gpt-oss is served on demand, so it needs no inference profile, and it read
# "tomorrow" correctly where the MiniMax models were a year or more out. On an
# app that schedules antenatal appointments that is not a detail.
DEFAULT_BEDROCK_MODEL = "openai.gpt-oss-120b-1:0"
# Behind it, also verified, for the failures that are per-model rather than
# per-account: a throttle, or a model never granted.
DEFAULT_BEDROCK_FALLBACK_MODEL = "minimax.minimax-m2.5"
DEFAULT_OPENAI_MODEL = "gpt-5.3-mini"
# An alias DeepSeek keeps pointed at its current model, rather than a version
# string that goes stale and then fails at call time.
DEFAULT_DEEPSEEK_MODEL = "deepseek-chat"

MAX_TOKENS = 2048
TEMPERATURE = 0.2


class NoModelConfigured(RuntimeError):
    """Neither provider has enough configuration to be worth calling."""


def build_model(settings):
    """The model the agent runs on, or a router across every configured one.

    Imported lazily by the caller: no provider SDK should be loaded on a
    process that only ever runs the scripted planner.
    """
    builders = {
        "bedrock": _bedrock_candidates,
        "deepseek": _deepseek_candidates,
        "openai": _openai_candidates,
    }

    candidates: list[tuple[str, object]] = []
    for name in settings.provider_order:
        candidates.extend(builders[name](settings))

    if not candidates:
        raise NoModelConfigured(
            "No model provider is configured. Set AWS credentials or an IAM role "
            "for Bedrock, or DEEPSEEK_API_KEY, or OPENAI_API_KEY."
        )

    if len(candidates) == 1:
        log.info("Model: %s", _id_of(candidates[0][1]))
        return candidates[0][1]

    from strands.models import FallbackStrategy, ModelRouter, RoutingCandidate

    log.info(
        "Model router: %s",
        " then ".join(f"{name} ({_id_of(model)})" for name, model in candidates),
    )
    return ModelRouter(
        [RoutingCandidate(model=model, name=name) for name, model in candidates],
        strategy=FallbackStrategy(),
    )


def _bedrock_candidates(settings) -> list[tuple[str, object]]:
    if not settings.use_bedrock_model:
        return []

    from strands.models import BedrockModel

    def build(model_id: str):
        return BedrockModel(
            model_id=model_id,
            region_name=settings.aws_region,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )

    discover = getattr(settings, "bedrock_discover", True)
    primary = resolve(
        settings.bedrock_model_id or DEFAULT_BEDROCK_MODEL,
        settings.aws_region,
        discover=discover,
    )
    out = [("bedrock", build(primary))]

    # Two Bedrock candidates are worth having even though they share
    # credentials: the failures they cover are per-model, not per-account —
    # a throttle, or a model the account has not been granted.
    second = getattr(settings, "bedrock_fallback_model_id", "") or ""
    if second:
        second = resolve(second, settings.aws_region, discover=discover)
    if second and second != primary:
        out.append(("bedrock-2", build(second)))
    return out


def _deepseek_candidates(settings) -> list[tuple[str, object]]:
    """DeepSeek, through its OpenAI-compatible endpoint.

    Same client as OpenAI with a different base_url, which is what DeepSeek
    documents — so this needs no separate SDK and no separate code path.
    """
    if not settings.use_deepseek_model:
        return []

    from strands.models.openai import OpenAIModel

    return [
        (
            "deepseek",
            OpenAIModel(
                client_args={
                    "api_key": settings.deepseek_api_key,
                    "base_url": settings.deepseek_base_url,
                },
                model_id=settings.deepseek_model or DEFAULT_DEEPSEEK_MODEL,
                # max_tokens, not max_completion_tokens: DeepSeek follows the
                # older OpenAI parameter and rejects the newer name.
                params={"max_tokens": MAX_TOKENS, "temperature": TEMPERATURE},
            ),
        )
    ]


def _openai_candidates(settings) -> list[tuple[str, object]]:
    if not settings.use_openai_model:
        return []

    from strands.models.openai import OpenAIModel

    return [
        (
            "openai",
            OpenAIModel(
                client_args={"api_key": settings.openai_api_key},
                model_id=settings.openai_model or DEFAULT_OPENAI_MODEL,
                params={"max_completion_tokens": MAX_TOKENS},
            ),
        )
    ]


def _id_of(model) -> str:
    """The model id a provider was built with, for the log line."""
    config = getattr(model, "config", None)
    if isinstance(config, dict):
        return str(config.get("model_id", "?"))
    return "?"


def engine_label(settings) -> str:
    """What to record on the run when a model answered.

    The router does not report which candidate served a given call, so with
    both configured this says both were available in that order rather than
    inventing a certainty the API does not have.
    """
    active = {
        "bedrock": settings.use_bedrock_model,
        "deepseek": settings.use_deepseek_model,
        "openai": settings.use_openai_model,
    }
    names = [n for n in settings.provider_order if active[n]]
    return "+".join(names) or "scripted"


def describe(settings) -> list[str]:
    """The model ids in the order they would be tried, for /health.

    Reports what has already been resolved, and never triggers discovery: a
    health check runs constantly, and putting an AWS round trip behind one is
    how a slow Bedrock morning becomes a failing container.
    """
    out: list[str] = []
    for name in settings.provider_order:
        if name == "bedrock" and settings.use_bedrock_model:
            primary = resolve(
                settings.bedrock_model_id or DEFAULT_BEDROCK_MODEL,
                settings.aws_region,
                discover=False,
            )
            out.append(primary)
            second = getattr(settings, "bedrock_fallback_model_id", "") or ""
            if second:
                second = resolve(second, settings.aws_region, discover=False)
            if second and second != primary:
                out.append(second)
        elif name == "deepseek" and settings.use_deepseek_model:
            out.append(settings.deepseek_model or DEFAULT_DEEPSEEK_MODEL)
        elif name == "openai" and settings.use_openai_model:
            out.append(settings.openai_model or DEFAULT_OPENAI_MODEL)
    return out
