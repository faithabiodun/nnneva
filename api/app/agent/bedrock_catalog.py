"""Which Bedrock model id this account can actually invoke.

A model id is not something to hardcode and hope. Anthropic ids carry a
version and a date, on-demand access goes through a regional inference
profile whose id is prefixed again, and which of them an account is granted
differs between accounts. Getting it wrong does not fail at startup — it
fails at invoke time, with a message that reads like a network problem.

So this asks. The account is listed once, the answer is cached for the life
of the process, and the configured id is matched against what came back:

  - exactly present  → use it, nothing to decide
  - absent, but the same family is there → use that instead, and say so
  - the listing failed → use the configured id unchanged

The last case matters: a task role without list permission must still be able
to run, so a failure here is a shrug, never an error.
"""

from __future__ import annotations

import logging
import re
import time
log = logging.getLogger("nnneva.agent")

# A success is held for the life of the process; the answer does not change
# while a container runs.
_CATALOGUE: dict[str, tuple[str, ...]] = {}

# A failure is held only briefly. Caching it forever would mean credentials
# arriving a second late disable resolution until the task is replaced;
# not caching it at all would mean two failed AWS calls on every message for
# a task role that simply lacks the list permission. Neither is acceptable,
# so a failure is remembered for a few minutes and then retried.
_RETRY_AFTER_SECONDS = 300
_FAILED_AT: dict[str, float] = {}

FAMILIES = ("haiku", "sonnet", "opus")

# `us.anthropic.claude-haiku-4-5-20251001-v1:0` → the 20251001 part, so the
# newest of several is picked rather than whichever sorts first.
_DATE = re.compile(r"(\d{8})")


def family_of(model_id: str) -> str | None:
    lowered = (model_id or "").lower()
    return next((f for f in FAMILIES if f in lowered), None)


def _rank(model_id: str) -> tuple[int, str]:
    """Newest first, and a cross-region profile ahead of a bare model id.

    On-demand access to current Anthropic models is only offered through a
    profile, so a bare id that looks tempting is usually the one that fails.
    """
    date = _DATE.search(model_id)
    return (int(date.group(1)) if date else 0, model_id)


def catalogue(region: str, *, discover: bool = True) -> tuple[str, ...]:
    """Every Anthropic id this account can invoke in `region`.

    Inference profiles first, because that is what on-demand invocation
    actually uses. Empty when the listing could not be made at all — or when
    `discover` is false and nothing has been discovered yet, which is how a
    health check stays a health check rather than an AWS round trip.
    """
    if region in _CATALOGUE:
        return _CATALOGUE[region]
    if not discover:
        return ()

    last_failure = _FAILED_AT.get(region)
    if last_failure is not None and time.monotonic() - last_failure < _RETRY_AFTER_SECONDS:
        return ()

    found: list[str] = []
    try:
        import boto3

        client = boto3.client("bedrock", region_name=region)

        try:
            paginator = client.get_paginator("list_inference_profiles")
            for page in paginator.paginate():
                for profile in page.get("inferenceProfileSummaries", []):
                    if profile.get("status", "ACTIVE") != "ACTIVE":
                        continue
                    found.append(profile["inferenceProfileId"])
        except Exception as exc:  # noqa: BLE001
            log.info("Could not list Bedrock inference profiles: %s", exc)

        try:
            models = client.list_foundation_models(byProvider="anthropic")
            for model in models.get("modelSummaries", []):
                if "ON_DEMAND" in (model.get("inferenceTypesSupported") or []):
                    found.append(model["modelId"])
        except Exception as exc:  # noqa: BLE001
            log.info("Could not list Bedrock foundation models: %s", exc)

    except Exception as exc:  # noqa: BLE001 — no boto3, no credentials, no network
        log.info("Bedrock catalogue unavailable: %s", exc)

    anthropic = tuple(m for m in found if "anthropic" in m.lower())
    if anthropic:
        log.info("Bedrock offers %d Anthropic ids in %s", len(anthropic), region)
        _CATALOGUE[region] = anthropic
        _FAILED_AT.pop(region, None)
    else:
        _FAILED_AT[region] = time.monotonic()
    return anthropic


def resolve(
    wanted: str,
    region: str,
    *,
    available: tuple[str, ...] | None = None,
    discover: bool = True,
) -> str:
    """The id to actually use for `wanted`.

    Falls back to `wanted` untouched whenever there is nothing better to say,
    so this can only improve on the configured value, never break it.
    """
    if not wanted:
        return wanted

    ids = catalogue(region, discover=discover) if available is None else available
    if not ids or wanted in ids:
        return wanted

    family = family_of(wanted)
    if family is None:
        return wanted

    matches = [m for m in ids if family_of(m) == family]
    if not matches:
        log.warning(
            "Bedrock does not offer any %s model to this account; keeping %s",
            family,
            wanted,
        )
        return wanted

    # A cross-region profile beats a bare model id, then newest wins.
    profiles = [m for m in matches if not m.startswith("anthropic.")]
    best = max(profiles or matches, key=_rank)
    log.warning("Bedrock has no %s; using %s instead", wanted, best)
    return best
