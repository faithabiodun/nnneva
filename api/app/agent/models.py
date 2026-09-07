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
# Haiku: the cheapest and fastest of the family, and quite enough for work
# that is mostly reading a short profile and calling a tool.
#
# The exact string is a starting point, not a promise. Which ids an account
# can invoke differs between accounts, so bedrock_catalog.resolve asks Bedrock
# and swaps this for whatever Haiku it actually offers.
DEFAULT_BEDROCK_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
# Behind it, on the same credentials, for the failures that are per-model
# rather than per-account: a throttle, or a model never granted.
DEFAULT_BEDROCK_FALLBACK_MODEL = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
DEFAULT_OPENAI_MODEL = "gpt-5.3-mini"

MAX_TOKENS = 2048
TEMPERATURE = 0.2


class NoModelConfigured(RuntimeError):
    """Neither provider has enough configuration to be worth calling."""


def build_model(settings):
    """The model the agent runs on, or a router across both providers.

    Imported lazily by the caller: neither provider SDK should be loaded on a
    process that only ever runs the scripted planner.
    """
    candidates = []

    if settings.use_bedrock_model:
        from strands.models import BedrockModel

        def bedrock(model_id: str) -> "BedrockModel":
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
        candidates.append(("bedrock", bedrock(primary)))

        # Two Bedrock candidates are worth having even though they share
        # credentials: the failures they cover are per-model, not per-account
        # — a throttle, or a model the account has not been granted.
        second = getattr(settings, "bedrock_fallback_model_id", "") or ""
        if second:
            second = resolve(second, settings.aws_region, discover=discover)
        if second and second != primary:
            candidates.append(("bedrock-2", bedrock(second)))

    if settings.use_openai_model:
        from strands.models.openai import OpenAIModel

        candidates.append(
            (
                "openai",
                OpenAIModel(
                    client_args={"api_key": settings.openai_api_key},
                    model_id=settings.openai_model or DEFAULT_OPENAI_MODEL,
                    params={"max_completion_tokens": MAX_TOKENS},
                ),
            )
        )

    if not candidates:
        raise NoModelConfigured(
            "No model provider is configured. Set AWS credentials or an IAM role "
            "for Bedrock, or OPENAI_API_KEY for OpenAI."
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
    names = []
    if settings.use_bedrock_model:
        names.append("bedrock")
    if settings.use_openai_model:
        names.append("openai")
    return "+".join(names) or "scripted"


def describe(settings) -> list[str]:
    """The candidates in the order they would be tried, for /health.

    Reports what has already been resolved, and never triggers discovery: a
    health check runs constantly, and putting an AWS round trip behind one is
    how a slow Bedrock morning becomes a failing container.
    """
    out = []
    if settings.use_bedrock_model:
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
    if settings.use_openai_model:
        out.append(settings.openai_model or DEFAULT_OPENAI_MODEL)
    return out
