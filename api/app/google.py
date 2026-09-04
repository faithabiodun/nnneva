"""Verifying a Google ID token.

The web tier runs the OAuth redirect and swaps the authorization code for an
ID token, because that exchange needs the client secret and the web tier is
where the session cookie already lives. But the API must not take the identity
in that token on trust: if it accepted an email the web tier merely asserted,
anyone who could reach the API could sign in as anyone. So it verifies the
token's signature against Google's published keys itself.

PyJWT is already a dependency for session tokens and ships the JWKS client, so
this needs nothing new.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from jwt import PyJWKClient

# Google's JWKS endpoint, from its OpenID discovery document. PyJWKClient
# caches the fetched keys, so this is not a network call per sign-in.
_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"

# Google signs ID tokens with RS256. Pinning it stops a token from choosing a
# weaker algorithm — "none" above all — and having it honoured.
_ALGORITHMS = ["RS256"]

# Google issues with either form. Both are legitimate; accepting only one
# rejects valid tokens.
_ISSUERS = ("https://accounts.google.com", "accounts.google.com")

_jwks_client = PyJWKClient(_JWKS_URL)


class GoogleAuthError(Exception):
    """The token did not verify, or carried no usable identity."""


@dataclass(frozen=True)
class GoogleIdentity:
    email: str
    full_name: str


def verify_id_token(id_token: str, client_id: str) -> GoogleIdentity:
    """The identity inside a Google ID token, or GoogleAuthError.

    `audience` pins the token to our own OAuth client, so a valid token minted
    for some other application cannot be replayed here.
    """
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience=client_id,
            issuer=_ISSUERS,
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except Exception as exc:  # PyJWKClient and PyJWT raise separate hierarchies
        raise GoogleAuthError(str(exc)) from exc

    email = str(claims.get("email") or "").lower().strip()
    if not email:
        raise GoogleAuthError("The Google account did not return an email address")
    if claims.get("email_verified") is not True:
        # An unverified address could belong to someone else, and our accounts
        # are keyed by email.
        raise GoogleAuthError("That Google account's email address is not verified")

    # `name` is optional in the ID token; fall back to the local part rather
    # than storing an empty name, since full_name is not nullable.
    full_name = str(claims.get("name") or "").strip() or email.split("@", 1)[0]
    return GoogleIdentity(email=email, full_name=full_name[:120])
