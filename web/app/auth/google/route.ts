import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { GOOGLE_STATE_COOKIE, googleConfigured, googleRedirectUri } from "@/lib/google";

/**
 * Step 1 of Google sign-in: send the browser to Google's consent screen.
 *
 * The `state` value is generated here, stored in a short-lived httpOnly cookie
 * and echoed back by Google. The callback compares the two, which is what stops
 * an attacker from feeding us an authorization code obtained in their own
 * browser (CSRF against the login itself).
 */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?google=unavailable", request.nextUrl));
  }

  const state = randomBytes(32).toString("base64url");

  // Where to land afterwards. Only a path on this site is accepted, so the
  // parameter cannot be used to bounce someone to another origin after login.
  const requested = request.nextUrl.searchParams.get("next") ?? "";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "";

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", googleRedirectUri(request));
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  // Ask for an account chooser rather than silently reusing whichever Google
  // account the browser happens to be signed into.
  authorize.searchParams.set("prompt", "select_account");

  (await cookies()).set(GOOGLE_STATE_COOKIE, `${state}:${next}`, {
    httpOnly: true,
    sameSite: "lax", // must survive Google's cross-site redirect back to us
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authorize);
}
