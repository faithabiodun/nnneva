import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { OAUTH_COOKIE, redirectUri, supabaseConfigured, supabaseUrl } from "@/lib/supabase";

/**
 * Step 1: hand the browser to Supabase, which runs the Google consent screen.
 *
 * Supabase Auth uses PKCE, so we generate a verifier here, send only its SHA-256
 * hash, and keep the verifier in an httpOnly cookie. An attacker who intercepts
 * the authorization code cannot exchange it without that verifier. `state` is
 * carried in the same cookie and compared on the way back, which is what stops
 * a code obtained in someone else's browser being fed to us.
 */
export async function GET(request: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?google=unavailable", request.nextUrl));
  }

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("base64url");

  // Only a path on this site is accepted, so this cannot bounce someone to
  // another origin after login.
  const requested = request.nextUrl.searchParams.get("next") ?? "";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "";

  const authorize = new URL(`${supabaseUrl()}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", redirectUri(request));
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "s256");

  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ verifier, state, next }), {
    httpOnly: true,
    sameSite: "lax", // must survive the cross-site redirect back from Supabase
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authorize);
}
