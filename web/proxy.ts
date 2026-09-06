import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";

/**
 * Route protection. In Next 16 this file is `proxy.ts` — the old
 * `middleware.ts` name was retired.
 *
 * This is an optimistic check only: it looks at whether a session cookie is
 * present, never at whether it is valid. The real check is the API rejecting a
 * bad token, which `lib/api.ts` turns into a redirect. Verifying here would put
 * a network round trip on every prefetch.
 */

const SIGNED_IN_ONLY = [
  "/home",
  "/agent",
  "/chats",
  "/tasks",
  "/appointments",
  "/activity",
  "/partner",
  "/helping",
  "/profile",
  "/onboarding",
];

// The invite-link pages live under /invite, deliberately outside the list
// above. The prefix match would otherwise swallow them — they are reached with
// a link rather than a session, and the token is the whole authorisation.
//
// /helping is the opposite: the signed-in helper's own view of the people they
// are helping. Two different paths for two different ways in, so a prefix
// match can never confuse them.

const SIGNED_OUT_ONLY = ["/login", "/signup"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!signedIn && SIGNED_IN_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = absoluteUrl("/login", request);
    // Come back here once they are in, rather than dumping them on Home.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(absoluteUrl("/home", request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
