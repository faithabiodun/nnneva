import { NextResponse, type NextRequest } from "next/server";

import { forward } from "@/lib/partner";

/** Relays the partner's reply. The API is not reachable from the browser. */
export async function POST(request: NextRequest, ctx: RouteContext<"/helping/[token]/api/messages">) {
  const { token } = await ctx.params;
  const body = await request.json();
  return forward(`/partner/${encodeURIComponent(token)}/messages`, body);
}
