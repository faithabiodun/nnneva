"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import User
from app.security import read_token

DbSession = Annotated[Session, Depends(get_session)]


def current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")

    user_id = read_token(authorization.split(" ", 1)[1].strip())
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
