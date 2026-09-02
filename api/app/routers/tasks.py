"""Tasks, grouped by the goal that created them."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Goal, GoalStatus, Task, TaskStatus, utcnow
from app.schemas import GoalOut, TaskOut, TaskPatch

router = APIRouter(tags=["tasks"])


@router.get("/goals", response_model=list[GoalOut])
def list_goals(user: CurrentUser, db: DbSession) -> list[Goal]:
    return list(
        db.scalars(
            select(Goal)
            .where(Goal.user_id == user.id, Goal.status != GoalStatus.abandoned)
            .order_by(Goal.created_at.desc())
        ).all()
    )


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(user: CurrentUser, db: DbSession) -> list[Task]:
    return list(
        db.scalars(
            select(Task).where(Task.user_id == user.id).order_by(Task.created_at)
        ).all()
    )


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, payload: TaskPatch, user: CurrentUser, db: DbSession) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")

    if payload.title is not None:
        task.title = payload.title
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.status is not None:
        try:
            task.status = next(s for s in TaskStatus if s.value == payload.status)
        except StopIteration:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown status “{payload.status}”"
            ) from None
        task.completed_at = utcnow() if task.status is TaskStatus.complete else None

    db.commit()
    db.refresh(task)
    return task
