"""Sign up, sign in, and who am I."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import User
from app.schemas import LoginIn, SignUpIn, TokenOut
from app.security import hash_password, issue_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def sign_up(payload: SignUpIn, db: DbSession) -> TokenOut:
    email = payload.email.lower().strip()
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "That email already has an account")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    return TokenOut(access_token=issue_token(user.id), onboarded=False)


@router.post("/login", response_model=TokenOut)
def log_in(payload: LoginIn, db: DbSession) -> TokenOut:
    user = db.scalars(select(User).where(User.email == payload.email.lower().strip())).first()
    # One message for both failures, so the response cannot be used to find out
    # which addresses have accounts.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")
    return TokenOut(access_token=issue_token(user.id), onboarded=user.profile is not None)


@router.get("/me", response_model=TokenOut)
def me(user: CurrentUser) -> TokenOut:
    return TokenOut(access_token=issue_token(user.id), onboarded=user.profile is not None)
