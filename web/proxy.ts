import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

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
  "/tasks",
  "/appointments",
  "/activity",
  "/memory",
  "/profile",
  "/onboarding",
];

const SIGNED_OUT_ONLY = ["/login", "/signup"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!signedIn && SIGNED_IN_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL("/login", request.nextUrl);
    // Come back here once they are in, rather than dumping them on Home.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/home", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
