import "server-only";

import type { NextRequest } from "next/server";

/** Holds the PKCE verifier, CSRF state and post-login destination between steps. */
export const OAUTH_COOKIE = "nnneva_oauth";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL);
}

export function supabaseUrl(): string {
  return (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
}

/**
 * Where Supabase sends the browser back to. Must be listed under
 * Authentication → URL Configuration → Redirect URLs in the Supabase
 * dashboard, or Supabase refuses the redirect.
 *
 * SUPABASE_REDIRECT_URI wins when set. Otherwise it is derived from the
 * incoming request, which is right locally and behind a proxy that sets
 * X-Forwarded-Host, but set it explicitly in production rather than trusting a
 * header the client could influence.
 */
export function redirectUri(request: NextRequest): string {
  const configured = process.env.SUPABASE_REDIRECT_URI;
  if (configured) return configured;
  return new URL("/auth/callback", request.nextUrl.origin).toString();
}
