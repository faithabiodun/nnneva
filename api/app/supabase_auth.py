"""Verifying a Supabase-issued access token.

Google sign-in runs through Supabase Auth rather than through Google directly:
Supabase owns the OAuth redirect and the code exchange, and hands back its own
JWT. That keeps the Google client secret in Supabase's provider settings
instead of in our web tier, and means adding a second provider later is a
dashboard toggle rather than more code here.

What does not change is that this API verifies the token itself. It never takes
an identity the web tier merely asserts, because anything able to reach the API
could then sign in as anyone.

Supabase signs tokens one of two ways depending on when the project was made
and whether its keys have been rotated:

  * asymmetric (current default) — ES256/RS256, public keys published at
    /auth/v1/.well-known/jwks.json. Nothing secret is needed here.
  * shared secret (legacy) — HS256 with the project's JWT secret.

Which one a project uses cannot be told from the outside without fetching the
JWKS, so both are supported: set SUPABASE_JWT_SECRET for a legacy project,
leave it unset for a modern one.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from jwt import PyJWKClient

# Supabase mints tokens for its `authenticated` role. Pinning the audience
# stops a token issued for another purpose being replayed as a login.
_AUDIENCE = "authenticated"

_ASYMMETRIC = ["ES256", "RS256"]
_SYMMETRIC = ["HS256"]

# One client per project URL. PyJWKClient caches the fetched keys, so this is
# not a network call per sign-in.
_jwks_clients: dict[str, PyJWKClient] = {}


class SupabaseAuthError(Exception):
    """The token did not verify, or carried no usable identity."""


@dataclass(frozen=True)
class SupabaseIdentity:
    email: str
    full_name: str


def _jwks_client(supabase_url: str) -> PyJWKClient:
    if supabase_url not in _jwks_clients:
        _jwks_clients[supabase_url] = PyJWKClient(
            f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        )
    return _jwks_clients[supabase_url]


def verify_access_token(
    token: str, supabase_url: str, jwt_secret: str = ""
) -> SupabaseIdentity:
    """The identity inside a Supabase access token, or SupabaseAuthError."""
    issuer = f"{supabase_url.rstrip('/')}/auth/v1"
    try:
        if jwt_secret:
            key, algorithms = jwt_secret, _SYMMETRIC
        else:
            key = _jwks_client(supabase_url).get_signing_key_from_jwt(token).key
            algorithms = _ASYMMETRIC

        claims = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience=_AUDIENCE,
            issuer=issuer,
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except Exception as exc:  # PyJWKClient and PyJWT raise separate hierarchies
        raise SupabaseAuthError(str(exc)) from exc

    email = str(claims.get("email") or "").lower().strip()
    if not email:
        raise SupabaseAuthError("That account did not return an email address")

    # Supabase records provider verification under app_metadata for OAuth
    # sign-ins and email_verified for email sign-ups. Absent means unverified,
    # and our accounts are keyed by email, so an unverified address could be
    # someone else's.
    metadata = claims.get("user_metadata") or {}
    verified = metadata.get("email_verified")
    if verified is False:
        raise SupabaseAuthError("That account's email address is not verified")

    full_name = str(metadata.get("full_name") or metadata.get("name") or "").strip()
    return SupabaseIdentity(email=email, full_name=(full_name or email.split("@", 1)[0])[:120])
