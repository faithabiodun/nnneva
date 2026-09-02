"""The safety layer.

Three points of control, in order of how much they can be argued with:

1. `screen()` runs on the raw message *before* any model sees it. It is a rule
   set, not a prompt, so no phrasing can talk it out of firing. When it returns
   `same_day` or `emergency`, task automation stops for that turn entirely.
2. The system prompt (app/agent/prompt.py) tells the model what it may say.
3. `scrub()` runs on generated text *after* the model. It blocks diagnostic
   language and returns a replacement, so a slip never reaches the user.

The blueprint's rule is that Nnneva has exactly three things it may say about a
symptom: this is common and here is what usually helps; this needs a health
worker today; this needs one right now. There is no fourth, and no path by
which the model can invent one.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.models import SafetyBand

# ---------------------------------------------------------------------------
# Layer 1 — deterministic screen, before the model
# ---------------------------------------------------------------------------

# Obstetric red flags. Each entry is (band, human-readable trigger, patterns).
# Patterns are matched case-insensitively against the whole message.
#
# Some flags need two things at once — a headache alone is ordinary, a headache
# with visual change in the third trimester is not — so a rule may carry a
# `needs` list, all of which must also appear.


@dataclass(frozen=True)
class Rule:
    band: SafetyBand
    trigger: str
    any_of: tuple[str, ...]
    needs: tuple[str, ...] = ()


RULES: tuple[Rule, ...] = (
    Rule(
        SafetyBand.emergency,
        "Heavy bleeding",
        (r"\bheav(y|ily) bleed", r"\bbleeding heavil", r"\bhaemorrhag", r"\bhemorrhag",
         r"\bsoak(ing|ed)? (through )?(a )?(pad|pads)", r"\bgushing blood", r"\bblood clots?\b"),
    ),
    Rule(
        SafetyBand.emergency,
        "Convulsion or loss of consciousness",
        (r"\bfit(s|ting)?\b", r"\bseizure", r"\bconvuls", r"\bpassed out", r"\bfainted",
         r"\blost consciousness", r"\bblacked out"),
    ),
    Rule(
        SafetyBand.emergency,
        "Trouble breathing or chest pain",
        (r"\bcan'?t breathe", r"\bcannot breathe", r"\btrouble breathing",
         r"\bshort(ness)? of breath", r"\bchest pain", r"\btight chest"),
    ),
    Rule(
        SafetyBand.emergency,
        "Severe headache with visual change",
        (r"\bheadache", r"\bmigraine"),
        needs=(r"\bblurr?(y|ed|ing)", r"\bvision", r"\bseeing spots", r"\bflashing",
               r"\bdouble vision", r"\blight hurts"),
    ),
    Rule(
        SafetyBand.emergency,
        "Waters broken before term",
        (r"\bwaters? (have )?broke", r"\bwater broke", r"\bfluid (is )?leaking",
         r"\bleaking fluid"),
    ),
    Rule(
        SafetyBand.emergency,
        "Reduced fetal movement",
        # The subject has to be the baby, so "I have not moved the transport
        # task" does not read as an obstetric emergency. Everything else about
        # this rule is deliberately loose: a missed one is the worst kind.
        (r"\bbaby\b[^.]{0,60}(?:\bnot\b|n'?t\b|\bstopped\b|\bless\b|\bfewer\b|"
         r"\breduced\b|\bbarely\b|\bhardly\b)[^.]{0,20}\b(?:mov|kick)",
         r"(?:\bnot\b|n'?t\b|\bstopped\b|\bless\b|\bfewer\b|\breduced\b|\bbarely\b|"
         r"\bhardly\b)[^.]{0,20}\b(?:mov|kick)\w*\b[^.]{0,60}\bbaby\b",
         r"\b(?:no|less|fewer|reduced|decreased)\s+(?:fetal\s+|foetal\s+)?(?:movements?|kicks?)\b",
         r"\b(?:movements?|kicks?)\s+(?:have\s+|has\s+)?(?:reduced|decreased|stopped|slowed)\b"),
    ),
    Rule(
        SafetyBand.emergency,
        "Thoughts of self-harm",
        (r"\bkill(ing)? myself", r"\bend(ing)? (it all|it|my life)", r"\b(self.?)?harm(ing)? myself",
         r"\bhurt(ing)? myself", r"\bsuicid", r"\bdon'?t want to (be here|live|go on)",
         r"\bbetter off without me", r"\bno (point|reason) (in )?(living|going on)"),
    ),
    Rule(
        SafetyBand.same_day,
        "Fever",
        (r"\bfever", r"\btemperature (is )?(high|39|40)", r"\bburning up", r"\bchills\b"),
    ),
    Rule(
        SafetyBand.same_day,
        "Severe or persistent abdominal pain",
        (r"\bsevere (abdominal|stomach|belly|tummy) pain", r"\bbad (stomach|belly) pain",
         r"\bconstant pain", r"\bpain (that )?won'?t (go away|stop)"),
    ),
    Rule(
        SafetyBand.same_day,
        "Painful or burning urination",
        (r"\bburn(s|ing)?\b[^.]{0,24}\b(when|while|to)\b[^.]{0,12}\b(pee|piss|urinat)",
         r"\bpain(ful)?\b[^.]{0,24}\b(peeing|pissing|urinating|urination)",
         r"\bhurts? to (pee|piss|urinate)", r"\bcan'?t (pee|piss|urinate)",
         r"\bstinging\b[^.]{0,24}\b(pee|urinat)"),
    ),
    Rule(
        SafetyBand.same_day,
        "Sudden swelling",
        (r"\bsudden(ly)? swell", r"\bswollen face", r"\bface (is )?swollen",
         r"\bhands (are )?swollen"),
    ),
    Rule(
        SafetyBand.same_day,
        "Persistent vomiting",
        (r"\bcan'?t keep (anything|food|water) down", r"\bvomiting (all|every)",
         r"\bthrowing up (all|every|constantly)"),
    ),
    Rule(
        SafetyBand.routine,
        "Symptom mentioned",
        (r"\bswell(?:ing|s|ed|en)?\b", r"\bheadache", r"\bcramp", r"\bdizzy", r"\bdizziness",
         r"\bnausea", r"\bspotting", r"\bback pain", r"\bheartburn", r"\bitching"),
    ),
)


GUIDANCE = {
    SafetyBand.emergency: (
        "This needs to be assessed by a clinician now. Please call your clinic or "
        "go to the nearest maternity unit — do not wait for your next appointment. "
        "Nnneva has stopped creating tasks and reminders until you confirm you have "
        "been seen."
    ),
    SafetyBand.same_day: (
        "This needs a health worker today. Please call your clinic and describe what "
        "you are feeling. Nnneva has paused normal task automation for this request."
    ),
    SafetyBand.routine: (
        "Worth raising with your midwife at your next visit. Nnneva can add it to "
        "your questions so you do not have to remember it."
    ),
    SafetyBand.none: "",
}

# The bands at which the agent stops doing ordinary work and escalates instead.
STOPS_AUTOMATION = (SafetyBand.same_day, SafetyBand.emergency)


@dataclass
class Screening:
    band: SafetyBand
    trigger: str = ""
    excerpt: str = ""
    guidance: str = ""
    matched: list[str] = field(default_factory=list)

    @property
    def stops_automation(self) -> bool:
        return self.band in STOPS_AUTOMATION


def _sentence_around(text: str, match: re.Match[str]) -> str:
    """The sentence a match landed in, for the audit record."""
    start = text.rfind(".", 0, match.start()) + 1
    end = text.find(".", match.end())
    end = len(text) if end == -1 else end + 1
    return text[start:end].strip()[:300]


def screen(message: str) -> Screening:
    """Classify a message. Highest band wins; rules are never overridden."""
    text = message or ""
    best: Screening | None = None

    for rule in RULES:
        hit = None
        for pattern in rule.any_of:
            hit = re.search(pattern, text, re.IGNORECASE)
            if hit:
                break
        if not hit:
            continue
        if rule.needs and not any(re.search(p, text, re.IGNORECASE) for p in rule.needs):
            continue

        found = Screening(
            band=rule.band,
            trigger=rule.trigger,
            excerpt=_sentence_around(text, hit),
            guidance=GUIDANCE[rule.band],
            matched=[rule.trigger],
        )
        if best is None or _rank(found.band) > _rank(best.band):
            best = found
        elif _rank(found.band) == _rank(best.band):
            best.matched.append(rule.trigger)

    return best or Screening(band=SafetyBand.none)


def _rank(band: SafetyBand) -> int:
    return {
        SafetyBand.none: 0,
        SafetyBand.routine: 1,
        SafetyBand.same_day: 2,
        SafetyBand.emergency: 3,
    }[band]


# ---------------------------------------------------------------------------
# Layer 3 — output guardrail, after the model
# ---------------------------------------------------------------------------

# Language Nnneva may not produce: a named condition offered as a conclusion, a
# dose, a probability, or a reassurance that a symptom is definitely nothing.
#
# The diagnostic patterns require a condition to actually be named. An earlier
# version blocked any "you have", which caught Nnneva's own escalation message
# ("until you confirm you have been seen") and replaced the most important text
# in the product with a refusal. Precision here is not politeness — a guard that
# fires on safe text is a guard that gets switched off.

CONDITIONS = (
    r"pre-?eclampsia|eclampsia|hellp|placenta\s+p?r?a?evia|placental abruption|"
    r"ana?emia|gestational diabetes|diabetes|hypertension|high blood pressure|"
    r"an? (?:uti|urinary tract infection)|infection|sepsis|cholestasis|thrush|"
    r"preterm labou?r|miscarriage|ectopic (?:pregnancy)?|hyperemesis|thrombosis|"
    r"blood clot"
)

BANNED = (
    # "you have anaemia", "you may have an infection", "you've got pre-eclampsia"
    (rf"\byou(?:'?ve|'?re|\s+(?:have|had|may have|might have|probably have|likely have|"
     rf"could have|seem to have|are having|have got))\b[^.]{{0,30}}\b(?:{CONDITIONS})\b",
     "diagnosis"),
    # "this is pre-eclampsia", "that sounds like a UTI"
    (rf"\b(?:this|that|it)\s+(?:is|was|sounds like|looks like|could be|might be|"
     rf"is probably|is likely|will be)\b[^.]{{0,25}}\b(?:{CONDITIONS})\b", "diagnosis"),
    (r"\byou'?re? (?:suffering from|diagnosed with)\b", "diagnosis"),
    (r"\byour symptoms? (?:mean|indicate|confirm|show)\b", "diagnosis"),
    (r"\bit'?s (?:definitely|certainly|just|only) (?:nothing|fine|normal)\b",
     "false reassurance"),
    (r"\bnothing to worry about\b", "false reassurance"),
    (r"\b(?:no need|don'?t need|not necessary) to (?:see|call|contact|visit)\b"
     r"[^.]{0,20}\b(?:doctor|midwife|clinic|hospital|nurse)\b", "discourages care"),
    (r"\btake \d+\s?(?:mg|ml|g|mcg|tablets?|pills?|capsules?)\b", "dosing"),
    (r"\b\d+\s?(?:mg|ml|mcg)\b[^.]{0,24}\b(?:twice|three times|daily|"
     r"every \d+ hours?)\b", "dosing"),
    (r"\b\d{1,3}\s?(?:%|per ?cent)\s+(?:chance|risk|likelihood|probability)\b",
     "probability claim"),
    (r"\b(?:chance|risk|likelihood) of[^.]{0,30}\bis \d{1,3}\s?(?:%|per ?cent)\b",
     "probability claim"),
)

BLOCK_REPLACEMENT = (
    "I started to answer that in a way I am not allowed to — Nnneva does not name "
    "conditions, give doses, or tell you a symptom is nothing. What I can do is help "
    "you get this in front of someone qualified. Would you like me to save it as a "
    "question for your next visit, or show you how to reach your clinic today?"
)


@dataclass
class ScrubResult:
    text: str
    blocked: bool = False
    reason: str = ""

    @property
    def clean(self) -> bool:
        return not self.blocked


def scrub(text: str) -> ScrubResult:
    """Check generated text against the output guardrail.

    A block replaces the whole response rather than editing it: a paragraph with
    the diagnosis removed still reads as though one was reached.
    """
    for pattern, reason in BANNED:
        if re.search(pattern, text or "", re.IGNORECASE):
            return ScrubResult(text=BLOCK_REPLACEMENT, blocked=True, reason=reason)
    return ScrubResult(text=text or "")
