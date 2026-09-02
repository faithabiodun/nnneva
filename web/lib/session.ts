import "server-only";

import { cookies } from "next/headers";

/**
 * The session token lives in an httpOnly cookie, so it is never readable from
 * JavaScript. Every call to the API goes out from the server with it attached;
 * the browser never holds a bearer token at all.
 */
export const SESSION_COOKIE = "nnneva_session";

const TWO_WEEKS = 60 * 60 * 24 * 14;

export async function readSession(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function startSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWO_WEEKS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
