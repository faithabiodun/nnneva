"""A deterministic planner over the same tools.

Why this exists: Bedrock needs credentials, and the product has to work end to
end for anyone who clones the repo without them — and during a demo, where a
throttled model must not be the reason nothing happens. This is not a mock. It
calls the real tools, writes the real rows, and goes through the real safety
screen and the real approval gate. Only the *planning* is rules instead of a
model, and every run records which engine produced it so nothing here is ever
mistaken for model output.

It handles the blueprint's core workflow (§05) — appointment preparation plus a
test — and degrades to something honest on anything it does not recognise.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from app.agent import tools as T
from app.agent.safety import Screening
from app.models import ActionResult, RunStatus, Task, TaskStatus

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


@dataclass
class Intent:
    """What the message appears to be asking for. Flags are not exclusive."""

    prepare_appointment: bool = False
    blood_test: bool = False
    reminders: bool = False
    share: bool = False
    complete_task: str | None = None
    target_day: date | None = None


def read_intent(message: str) -> Intent:
    text = (message or "").lower()
    intent = Intent()

    intent.prepare_appointment = bool(
        re.search(r"\b(appointment|antenatal|anc|visit|midwife|clinic|check-?up|scan)\b", text)
    ) and bool(re.search(r"\b(prepare|preparing|question|ready|coming up|next)\b", text))
    intent.blood_test = bool(re.search(r"\b(blood test|bloods|lab|test|sample|fasting)\b", text))
    intent.reminders = bool(re.search(r"\b(remind|reminder|remember|don'?t forget)\b", text))
    intent.share = bool(re.search(r"\b(share|send|tell|forward|let .* know)\b", text)) and bool(
        re.search(r"\b(partner|husband|chidi|contact|mum|mother|sister|him|her|them)\b", text)
    )

    done = re.search(r"\b(mark|tick|set)\b[^.]{0,40}\b(done|complete|finished)\b", text)
    if done:
        intent.complete_task = message

    for name, index in WEEKDAYS.items():
        if name in text:
            intent.target_day = _next_weekday(index)
            break

    return intent


def _next_weekday(index: int, today: date | None = None) -> date:
    today = today or date.today()
    ahead = (index - today.weekday()) % 7
    return today + timedelta(days=ahead or 7)


DEFAULT_QUESTIONS = [
    "Is my blood pressure still in the normal range for this stage?",
    "What should I expect from the tests that are still outstanding?",
    "Are the symptoms I have been having usual at this point?",
    "What are the signs that I should come in before my next visit?",
]

DEFAULT_PREPARATION = [
    "Bring the previous test results",
    "Bring the antenatal card",
    "Arrange transport in good time",
]


def run(box: T.Toolbox, message: str, screening: Screening) -> str:
    """Execute a plan for `message` and return the reply text."""
    context = T.get_user_context(box)
    T.safety_check(box, message)

    if screening.stops_automation:
        return _escalation_reply(screening, context)

    intent = read_intent(message)
    did: list[str] = []

    if intent.complete_task:
        closed = _complete_matching_task(box, message)
        if closed:
            did.append(f"marked “{closed}” complete")

    appointment = (context.get("next_appointments") or [None])[0]

    if intent.prepare_appointment or (appointment and not any(vars(intent).values())):
        questions = DEFAULT_QUESTIONS[:]
        if intent.blood_test:
            questions.insert(1, "What do I need to do before the blood test?")
        result = T.create_appointment_preparation(
            box, questions=questions, preparation=DEFAULT_PREPARATION
        )
        if "error" not in result:
            did.append(f"saved {result['questions']} questions for your next visit")
            T.create_task(
                box,
                "Pack the folder with previous results",
                due_date=_day_before(appointment),
                status="To do",
            )
            did.append("added the preparation to your tasks")

    if intent.blood_test:
        fast = T.create_task(
            box,
            "Fast from 21:00 the night before the blood test",
            detail="No food or drink other than water after 21:00.",
            due_date=_day_before(appointment),
            status="Scheduled",
        )
        T.create_task(box, "Book a lab slot", due_date=_iso(date.today()), status="To do")
        T.create_task(box, "Collect the results", status="To do")
        did.append("created the blood-test tasks")

        fire = _evening_before(appointment)
        if fire:
            T.schedule_reminder(
                box, "Start fasting at 21:00 for tomorrow's blood test",
                fire_at=fire, task_id=fast.get("id"),
            )
            did.append("scheduled the fasting reminder")

        T.save_memory(
            box,
            "Blood test outstanding. Fasting required from 21:00 the night before.",
            kind="Pregnancy context",
        )

    if intent.reminders and not intent.blood_test and appointment:
        T.schedule_reminder(
            box,
            f"{appointment['title']} tomorrow",
            fire_at=_evening_before(appointment) or _iso(date.today()),
        )
        did.append("scheduled a reminder")

    if intent.share:
        shared = T.share_with_contact(
            box,
            "the blood test reminder",
            why="Sends health information outside your account, so it waits for you",
        )
        if "error" not in shared:
            did.append("asked whether the reminder can go to your trusted contact")

    if not did:
        # Nothing matched. Say so rather than inventing work — a task the user
        # did not ask for is worse than an honest "I did not understand".
        box.record(
            "get_user_context",
            "Read the request but found nothing to act on",
            result=ActionResult.ok,
            result_label="No action",
        )
        return (
            "I read that but I could not turn it into anything concrete. Tell me what "
            "you want handled — an appointment to prepare for, a test to arrange, or "
            "something to remember — and I will set it up."
        )

    return _summary_reply(did, box)


def _summary_reply(did: list[str], box: T.Toolbox) -> str:
    body = did[0].capitalize() if len(did) == 1 else (
        ", ".join(did[:-1]).capitalize() + f", and {did[-1]}"
    )
    lines = [f"Done. I have {body[0].lower() + body[1:]}."]
    waiting = [a for a in box.approvals if a.status.value == "pending"]
    if waiting:
        lines.append("")
        lines.append(
            f"One thing is waiting on you: {waiting[0].question} Nothing has been sent."
        )
    return "\n".join(lines)


def _escalation_reply(screening: Screening, context: dict) -> str:
    clinic = context.get("care_location") or "your clinic"
    return (
        f"{screening.guidance}\n\n"
        f"Call {clinic} now and describe exactly what you told me. "
        "I am not able to tell you what is causing this, and I have not created any "
        "tasks or reminders for this message."
    )


def _complete_matching_task(box: T.Toolbox, message: str) -> str | None:
    """Close the open task whose title best overlaps the message."""
    words = {w for w in re.findall(r"[a-z]{4,}", message.lower())}
    best, best_score = None, 0
    for task in box.user.tasks:
        if task.status in (TaskStatus.complete, TaskStatus.cancelled):
            continue
        score = len(words & set(re.findall(r"[a-z]{4,}", task.title.lower())))
        if score > best_score:
            best, best_score = task, score
    if best is None or best_score < 2:
        return None
    T.update_task(box, best.id, status="Complete")
    return best.title


def _iso(value: date | None) -> str | None:
    return value.isoformat() if value else None


def _day_before(appointment: dict | None) -> str | None:
    if not appointment:
        return None
    starts = datetime.fromisoformat(appointment["starts_at"])
    return (starts.date() - timedelta(days=1)).isoformat()


def _evening_before(appointment: dict | None) -> str | None:
    if not appointment:
        return None
    starts = datetime.fromisoformat(appointment["starts_at"])
    when = datetime.combine(starts.date() - timedelta(days=1), time(21, 0), tzinfo=timezone.utc)
    return when.isoformat()
