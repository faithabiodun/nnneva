import { timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { api, ApiError } from "@/lib/api";
import { GOOGLE_STATE_COOKIE, googleConfigured, googleRedirectUri } from "@/lib/google";
import { startSession } from "@/lib/session";
import type { Token } from "@/lib/types";

/**
 * Step 2 of Google sign-in: Google sends the browser back here with a code.
 *
 * We swap it for an ID token (that exchange needs the client secret, which is
 * why it happens here and not in the API), then hand the ID token to the API.
 * The API verifies its signature against Google's keys itself — it does not
 * take our word for who this is.
 */
export async function GET(request: NextRequest) {
  const jar = await cookies();
  const stored = jar.get(GOOGLE_STATE_COOKIE)?.value ?? "";
  jar.delete(GOOGLE_STATE_COOKIE); // single use, whatever happens below

  if (!googleConfigured()) return fail(request, "unavailable");

  // Google reports a refusal here rather than by failing the exchange.
  if (request.nextUrl.searchParams.get("error")) return fail(request, "cancelled");

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state") ?? "";
  const [expectedState, next = ""] = stored.split(":");

  if (!code || !expectedState || !constantTimeEqual(expectedState, returnedState)) {
    return fail(request, "state");
  }

  let idToken: string;
  try {
    idToken = await exchangeCode(code, googleRedirectUri(request));
  } catch {
    return fail(request, "exchange");
  }

  let token: Token;
  try {
    token = await api.post<Token>("/auth/google", { id_token: idToken }, true);
  } catch (error) {
    // 501 means the API has no GOOGLE_CLIENT_ID set — a misconfiguration on our
    // side, not something the person signing in did wrong.
    if (error instanceof ApiError && error.status === 501) return fail(request, "unavailable");
    return fail(request, "api");
  }

  await startSession(token.access_token);

  const destination = next || (token.onboarded ? "/home" : "/onboarding");
  return NextResponse.redirect(new URL(destination, request.nextUrl));
}

async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Google token exchange failed with ${response.status}`);

  const payload: unknown = await response.json();
  const idToken =
    typeof payload === "object" && payload !== null && "id_token" in payload
      ? (payload as { id_token?: unknown }).id_token
      : undefined;

  if (typeof idToken !== "string" || !idToken) throw new Error("No id_token in Google's response");
  return idToken;
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, so check that separately.
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Back to the login screen with a reason the page knows how to explain. */
function fail(request: NextRequest, reason: string) {
  const login = new URL("/login", request.nextUrl);
  login.searchParams.set("google", reason);
  return NextResponse.redirect(login);
}
