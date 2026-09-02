"""The safety layer, which is the part that must not be wrong."""

import pytest

from app.agent.safety import screen, scrub
from app.models import SafetyBand

EMERGENCY = [
    "I have had a bad headache since last night and my vision keeps going blurry",
    "I am bleeding heavily, I soaked through a pad in an hour",
    "the baby isn't moving today",
    "baby has not moved since yesterday",
    "I have felt fewer kicks than usual",
    "movements have reduced over the last two days",
    "I fainted this morning",
    "I can't breathe properly and my chest hurts",
    "my waters have broken and I am only 30 weeks",
    "I keep thinking about ending my life",
]

SAME_DAY = [
    "I have a fever and chills",
    "it burns when I pee",
    "my face is swollen suddenly",
    "I can't keep anything down",
    "severe stomach pain that won't go away",
]

ROUTINE = [
    "my feet swell in the evenings",
    "I get heartburn most nights",
    "I have had some back pain",
]

CLEAR = [
    "I have an antenatal appointment next Thursday and want to prepare questions",
    "Can you remind me to collect the results on Friday?",
    "Move the transport task to Wednesday, I have not moved it yet",
    "Mark the folder task as done",
]


@pytest.mark.parametrize("message", EMERGENCY)
def test_emergencies_escalate(message):
    result = screen(message)
    assert result.band is SafetyBand.emergency, message
    assert result.stops_automation


@pytest.mark.parametrize("message", SAME_DAY)
def test_same_day_stops_automation(message):
    result = screen(message)
    assert result.band is SafetyBand.same_day, message
    assert result.stops_automation


@pytest.mark.parametrize("message", ROUTINE)
def test_routine_symptoms_are_noted_but_do_not_stop_work(message):
    result = screen(message)
    assert result.band is SafetyBand.routine, message
    assert not result.stops_automation


@pytest.mark.parametrize("message", CLEAR)
def test_ordinary_coordination_is_not_flagged(message):
    assert screen(message).band is SafetyBand.none, message


def test_highest_band_wins_when_several_rules_match():
    # Swelling alone is routine; with a headache and visual change it is not.
    result = screen("my feet are swollen and my headache makes my vision blurry")
    assert result.band is SafetyBand.emergency


def test_screening_records_the_sentence_it_matched():
    result = screen("I am fine otherwise. The baby has not moved since yesterday. Please help.")
    assert "not moved" in result.excerpt
    assert "fine otherwise" not in result.excerpt


BLOCKED = [
    "This is probably pre-eclampsia and you should rest.",
    "That sounds like a UTI.",
    "You have gestational diabetes.",
    "You may have an infection.",
    "You've got anaemia, which is very common.",
    "You're suffering from hyperemesis.",
    "Your symptoms indicate preterm labour.",
    "Take 500mg paracetamol twice daily.",
    "Take 2 tablets in the morning.",
    "It's definitely nothing to worry about.",
    "There is nothing to worry about here.",
    "There's no need to see a doctor for this.",
    "There is a 20 per cent chance of this being serious.",
]

ALLOWED = [
    "I saved six questions for Thursday and created four tasks.",
    "This needs a health worker today. Please call your clinic.",
    "Swelling in the evenings is common in the third trimester; putting your feet up often helps.",
    "Do you have questions you want me to save for the midwife?",
    # The phrasings that a broader guard used to swallow.
    "Nnneva has paused your tasks until you confirm you have been seen.",
    "You have three tasks due tomorrow and one appointment on Thursday.",
    "You have an appointment with Grace Okonkwo at 09:30.",
    "I have not created any tasks for this message.",
    "Your midwife can tell you what this is — I cannot.",
    "I have saved 6 questions for your next visit.",
]


@pytest.mark.parametrize("text", BLOCKED)
def test_diagnostic_language_is_blocked(text):
    result = scrub(text)
    assert result.blocked, text
    assert "not allowed" in result.text


@pytest.mark.parametrize("text", ALLOWED)
def test_safe_language_passes_through(text):
    result = scrub(text)
    assert result.clean, text
    assert result.text == text


# ---------------------------------------------------------------------------
# The guardrail must never eat the safety layer's own words. A live run once
# replaced the entire emergency escalation with a refusal, which is the single
# worst thing this file could do.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("band", list(SafetyBand))
def test_the_guardrail_never_blocks_its_own_guidance(band):
    from app.agent.safety import GUIDANCE

    text = GUIDANCE[band]
    if not text:
        return
    assert scrub(text).clean, f"guidance for {band.value} was blocked by the output guard"


def test_the_guardrail_never_blocks_its_own_replacement():
    from app.agent.safety import BLOCK_REPLACEMENT

    assert scrub(BLOCK_REPLACEMENT).clean


def test_the_full_escalation_reply_survives_the_guardrail():
    from app.agent.scripted import _escalation_reply

    reply = _escalation_reply(
        screen("I have a headache and my vision is blurry"),
        {"care_location": "Lagoon Antenatal Clinic"},
    )
    assert scrub(reply).clean
    assert "clinician" in reply
