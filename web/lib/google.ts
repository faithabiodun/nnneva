import "server-only";

import type { NextRequest } from "next/server";

/** Holds the CSRF state and the post-login destination between the two steps. */
export const GOOGLE_STATE_COOKIE = "nnneva_oauth_state";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The redirect_uri sent to Google, which must match one of the values
 * registered on the OAuth client exactly — scheme, host, port and path.
 *
 * GOOGLE_REDIRECT_URI wins when set. Otherwise it is derived from the incoming
 * request, which is right in development and behind a proxy that sets
 * X-Forwarded-Host/Proto, but set the variable explicitly in production rather
 * than trusting a header the client could influence.
 */
export function googleRedirectUri(request: NextRequest): string {
  const configured = process.env.GOOGLE_REDIRECT_URI;
  if (configured) return configured;
  return new URL("/auth/google/callback", request.nextUrl.origin).toString();
}
