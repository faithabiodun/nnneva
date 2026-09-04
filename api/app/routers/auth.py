"""Sign up, sign in, and who am I."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.google import GoogleAuthError, verify_id_token
from app.models import User
from app.schemas import GoogleAuthIn, LoginIn, SignUpIn, TokenOut
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


@router.post("/google", response_model=TokenOut)
def google_sign_in(payload: GoogleAuthIn, db: DbSession) -> TokenOut:
    """Sign in or sign up with a verified Google ID token.

    One route for both, because Google does not distinguish them: the person
    either already has an account under that address or gets one now.
    """
    settings = get_settings()
    if not settings.google_enabled:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED, "Google sign-in is not configured on this server"
        )

    try:
        identity = verify_id_token(payload.id_token, settings.google_client_id)
    except GoogleAuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    user = db.scalars(select(User).where(User.email == identity.email)).first()
    if user is None:
        # No password hash: this account is reachable through Google only,
        # unless its owner later sets a password.
        user = User(email=identity.email, full_name=identity.full_name, password_hash=None)
        db.add(user)
        db.commit()

    return TokenOut(access_token=issue_token(user.id), onboarded=user.profile is not None)


@router.get("/me", response_model=TokenOut)
def me(user: CurrentUser) -> TokenOut:
    return TokenOut(access_token=issue_token(user.id), onboarded=user.profile is not None)
