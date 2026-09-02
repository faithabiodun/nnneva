"""What Nnneva remembers, and forgetting it."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Memory, utcnow
from app.schemas import MemoryOut

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("", response_model=list[MemoryOut])
def list_memories(user: CurrentUser, db: DbSession) -> list[Memory]:
    return list(
        db.scalars(
            select(Memory)
            .where(Memory.user_id == user.id, Memory.forgotten_at.is_(None))
            .order_by(Memory.kind, Memory.created_at)
        ).all()
    )


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def forget(memory_id: str, user: CurrentUser, db: DbSession) -> None:
    memory = db.get(Memory, memory_id)
    if memory is None or memory.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such memory")
    # Tombstoned rather than deleted, so the activity history that references it
    # stays readable and "forgotten on request" is itself a fact of record.
    memory.forgotten_at = utcnow()
    db.commit()
