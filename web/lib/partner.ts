import "server-only";

import { NextResponse } from "next/server";

/**
 * Relay a partner action to the API.
 *
 * The API is not reachable from a browser, so the partner's page has to go
 * through the Next server like every other call. This is deliberately dumb: it
 * forwards the path and returns the status unchanged, so the API stays the only
 * place that decides what a token may do.
 */
export async function forward(path: string, body?: unknown): Promise<NextResponse> {
  const base = process.env.API_BASE_URL ?? "http://localhost:8000";
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  return new NextResponse(text || null, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
