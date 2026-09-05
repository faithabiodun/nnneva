import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { api, ApiError } from "@/lib/api";
import { OAUTH_COOKIE, supabaseConfigured, supabaseUrl } from "@/lib/supabase";
import { startSession } from "@/lib/session";
import type { Token } from "@/lib/types";

/**
 * Step 2: Supabase sends the browser back with an authorization code.
 *
 * We exchange it for a Supabase access token, then hand that to our API, which
 * verifies the signature itself rather than trusting anything asserted here.
 */
export async function GET(request: NextRequest) {
  const jar = await cookies();
  const stored = jar.get(OAUTH_COOKIE)?.value ?? "";
  jar.delete(OAUTH_COOKIE); // single use, whatever happens below

  if (!supabaseConfigured()) return fail(request, "unavailable");

  // Supabase reports a refusal here rather than by failing the exchange.
  if (request.nextUrl.searchParams.get("error")) return fail(request, "cancelled");

  const code = request.nextUrl.searchParams.get("code");
  let saved: { verifier?: string; next?: string };
  try {
    saved = JSON.parse(stored);
  } catch {
    return fail(request, "state");
  }

  if (!code || !saved.verifier) return fail(request, "state");

  let accessToken: string;
  try {
    accessToken = await exchangeCode(code, saved.verifier);
  } catch {
    return fail(request, "exchange");
  }

  let token: Token;
  try {
    token = await api.post<Token>("/auth/supabase", { access_token: accessToken }, true);
  } catch (error) {
    // 501 means the API has no SUPABASE_URL set — our misconfiguration, not
    // something the person signing in did wrong.
    if (error instanceof ApiError && error.status === 501) return fail(request, "unavailable");
    return fail(request, "api");
  }

  await startSession(token.access_token);

  const destination = saved.next || (token.onboarded ? "/home" : "/onboarding");
  return NextResponse.redirect(new URL(destination, request.nextUrl));
}

async function exchangeCode(code: string, verifier: string): Promise<string> {
  const response = await fetch(`${supabaseUrl()}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase requires the publishable key on every auth call. It is not a
      // secret — it identifies the project and carries no privileges of its own.
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Supabase token exchange failed with ${response.status}`);

  const payload: unknown = await response.json();
  const accessToken =
    typeof payload === "object" && payload !== null && "access_token" in payload
      ? (payload as { access_token?: unknown }).access_token
      : undefined;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("No access_token in Supabase's response");
  }
  return accessToken;
}

/** Back to the login screen with a reason the page knows how to explain. */
function fail(request: NextRequest, reason: string) {
  const login = new URL("/login", request.nextUrl);
  login.searchParams.set("google", reason);
  return NextResponse.redirect(login);
}
