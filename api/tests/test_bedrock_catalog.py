"""Choosing a model id from what the account actually offers.

This exists because a wrong Bedrock model id does not fail at startup. It is
accepted by the SDK and rejected at invoke time with a message that reads
like a network problem — which is exactly how the wrong id sat in this
project's config for days. The rule here is that asking Bedrock can only
improve on the configured value, never break it.
"""

from __future__ import annotations

import pytest

from app.agent.bedrock_catalog import family_of, resolve

HAIKU = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
SONNET = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
OLD_HAIKU = "us.anthropic.claude-haiku-3-5-20241022-v1:0"
BARE_HAIKU = "anthropic.claude-haiku-4-5-20251001-v1:0"


def pick(wanted: str, *available: str) -> str:
    return resolve(wanted, "us-east-1", available=tuple(available))


# ---- Families --------------------------------------------------------------


@pytest.mark.parametrize(
    "model_id,family",
    [
        (HAIKU, "haiku"),
        (SONNET, "sonnet"),
        ("us.anthropic.claude-opus-4-1-20250805-v1:0", "opus"),
        ("meta.llama3-70b-instruct-v1:0", None),
    ],
)
def test_the_family_is_read_off_the_id(model_id, family):
    assert family_of(model_id) == family


# ---- Resolving -------------------------------------------------------------


def test_an_id_the_account_has_is_left_alone():
    assert pick(HAIKU, HAIKU, SONNET) == HAIKU


def test_an_absent_id_is_swapped_for_the_same_family():
    """The whole point: "haiku" is the intent, the exact string is a guess."""
    assert pick("us.anthropic.claude-haiku-9-9-20991231-v1:0", OLD_HAIKU, SONNET) == OLD_HAIKU


def test_the_newest_of_several_wins():
    assert pick("us.anthropic.claude-haiku-9-9-20991231-v1:0", OLD_HAIKU, HAIKU) == HAIKU


def test_an_inference_profile_beats_a_bare_model_id():
    """On-demand access to current models goes through a profile; the bare id
    is the one that looks fine and then fails at invoke time."""
    assert pick("us.anthropic.claude-haiku-9-9-20991231-v1:0", BARE_HAIKU, HAIKU) == HAIKU


def test_a_family_the_account_does_not_have_is_left_alone():
    """Substituting Sonnet for a missing Haiku would quietly multiply the bill.

    Better to attempt the configured id and fail loudly than to spend someone's
    money on a model they did not ask for.
    """
    assert pick(HAIKU, SONNET) == HAIKU


def test_an_empty_catalogue_changes_nothing():
    """A task role without list permission must still run."""
    assert pick(HAIKU) == HAIKU


def test_an_unrecognised_id_is_left_alone():
    assert pick("meta.llama3-70b-instruct-v1:0", HAIKU) == "meta.llama3-70b-instruct-v1:0"


def test_an_empty_id_stays_empty():
    """Empty means "no second candidate", not "find me one"."""
    assert pick("", HAIKU) == ""


# ---- Reading the account's catalogue ---------------------------------------
#
# The listing itself cannot be tested against real Bedrock from here, so the
# boto3 client is stubbed. What is under test is the parsing and filtering —
# which is where a mistake would be silent, because an empty catalogue looks
# exactly like "no permission" and simply leaves the configured id alone.


class _Paginator:
    def __init__(self, pages):
        self._pages = pages

    def paginate(self):
        return iter(self._pages)


class _FakeBedrock:
    def __init__(self, profiles=(), models=(), fail=None):
        self._profiles = profiles
        self._models = models
        self._fail = fail

    def get_paginator(self, name):
        if self._fail == "profiles":
            raise RuntimeError("no permission")
        return _Paginator([{"inferenceProfileSummaries": list(self._profiles)}])

    def list_foundation_models(self, **_):
        if self._fail == "models":
            raise RuntimeError("no permission")
        return {"modelSummaries": list(self._models)}


@pytest.fixture
def bedrock(monkeypatch):
    """Swap boto3's client for a stub, and clear the module's caches."""
    from app.agent import bedrock_catalog as catalog

    def install(client):
        catalog._CATALOGUE.clear()
        catalog._FAILED_AT.clear()
        import boto3

        monkeypatch.setattr(boto3, "client", lambda *a, **k: client)
        return catalog

    yield install
    from app.agent import bedrock_catalog as catalog

    catalog._CATALOGUE.clear()
    catalog._FAILED_AT.clear()


def test_active_profiles_and_on_demand_models_are_collected(bedrock):
    catalog = bedrock(
        _FakeBedrock(
            profiles=[
                {"inferenceProfileId": HAIKU, "status": "ACTIVE"},
                {"inferenceProfileId": OLD_HAIKU, "status": "ACTIVE"},
            ],
            models=[
                {"modelId": BARE_HAIKU, "inferenceTypesSupported": ["ON_DEMAND"]},
                {"modelId": "anthropic.claude-x", "inferenceTypesSupported": ["PROVISIONED"]},
                {"modelId": "meta.llama3", "inferenceTypesSupported": ["ON_DEMAND"]},
            ],
        )
    )
    found = catalog.catalogue("us-east-1")
    assert HAIKU in found and OLD_HAIKU in found and BARE_HAIKU in found
    # Provisioned-only is not invocable on demand; a non-Anthropic id is not ours.
    assert "anthropic.claude-x" not in found
    assert "meta.llama3" not in found


def test_a_draining_profile_is_not_offered(bedrock):
    catalog = bedrock(
        _FakeBedrock(profiles=[{"inferenceProfileId": HAIKU, "status": "DRAINING"}])
    )
    assert catalog.catalogue("us-east-1") == ()


def test_one_listing_failing_does_not_lose_the_other(bedrock):
    """A role allowed to list models but not profiles still gets an answer."""
    catalog = bedrock(
        _FakeBedrock(
            models=[{"modelId": BARE_HAIKU, "inferenceTypesSupported": ["ON_DEMAND"]}],
            fail="profiles",
        )
    )
    assert catalog.catalogue("us-east-1") == (BARE_HAIKU,)


def test_a_success_is_remembered(bedrock):
    catalog = bedrock(
        _FakeBedrock(profiles=[{"inferenceProfileId": HAIKU, "status": "ACTIVE"}])
    )
    assert catalog.catalogue("us-east-1") == (HAIKU,)
    # The stub would answer again; the cache means it is never asked.
    assert catalog._CATALOGUE["us-east-1"] == (HAIKU,)


def test_a_failure_is_not_remembered_forever(bedrock, monkeypatch):
    """Credentials arriving a second late must not disable this for the life
    of the task — but a role with no permission must not retry every message
    either, so the failure is held for a few minutes and then reconsidered."""
    catalog = bedrock(_FakeBedrock(fail="profiles"))
    assert catalog.catalogue("us-east-1") == ()
    assert "us-east-1" in catalog._FAILED_AT

    clock = [catalog._RETRY_AFTER_SECONDS + 1.0]
    monkeypatch.setattr(catalog.time, "monotonic", lambda: clock[0])
    catalog._FAILED_AT["us-east-1"] = 0.0
    monkeypatch.setattr(
        __import__("boto3"), "client",
        lambda *a, **k: _FakeBedrock(profiles=[{"inferenceProfileId": HAIKU, "status": "ACTIVE"}]),
    )
    assert catalog.catalogue("us-east-1") == (HAIKU,)


def test_discovery_can_be_skipped_entirely(bedrock):
    """What /health does, so a health check never becomes an AWS round trip."""
    catalog = bedrock(
        _FakeBedrock(profiles=[{"inferenceProfileId": HAIKU, "status": "ACTIVE"}])
    )
    assert catalog.catalogue("us-east-1", discover=False) == ()
