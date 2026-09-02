"""Appointments and their preparation."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Appointment, AppointmentQuestion, PreparationItem, utcnow
from app.schemas import AppointmentOut, AppointmentsOut, QuestionIn, QuestionOut

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=AppointmentsOut)
def list_appointments(user: CurrentUser, db: DbSession) -> AppointmentsOut:
    now = utcnow()
    upcoming = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.user_id == user.id, Appointment.starts_at >= now)
            .order_by(Appointment.starts_at)
        ).all()
    )
    past = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.user_id == user.id, Appointment.starts_at < now)
            .order_by(Appointment.starts_at.desc())
        ).all()
    )
    return AppointmentsOut(upcoming=upcoming, past=past)


def _owned(appointment_id: str, user, db) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or appointment.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such appointment")
    return appointment


@router.post(
    "/{appointment_id}/questions",
    response_model=QuestionOut,
    status_code=status.HTTP_201_CREATED,
)
def add_question(
    appointment_id: str, payload: QuestionIn, user: CurrentUser, db: DbSession
) -> AppointmentQuestion:
    appointment = _owned(appointment_id, user, db)
    question = AppointmentQuestion(
        appointment_id=appointment.id,
        text=payload.text.strip(),
        # Marked as hers so the list can show which questions she added herself.
        source="You",
        position=len(appointment.questions),
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.patch("/{appointment_id}/preparation/{item_id}", response_model=AppointmentOut)
def toggle_preparation(
    appointment_id: str, item_id: str, user: CurrentUser, db: DbSession
) -> Appointment:
    appointment = _owned(appointment_id, user, db)
    item = db.get(PreparationItem, item_id)
    if item is None or item.appointment_id != appointment.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such preparation item")
    item.done = not item.done
    db.commit()
    db.refresh(appointment)
    return appointment
