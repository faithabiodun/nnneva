import type { NextRequest } from "next/server";

/**
 * Build an absolute URL on this site's *public* origin.
 *
 * `request.nextUrl` cannot be trusted for this behind CloudFront. The
 * distribution deliberately does not forward the viewer's Host header — the ECS
 * gateway routes on Host and would fail to match its own service — so the
 * container sees its own internal address, and a redirect built from it sends
 * the browser to something like ip-172-31-84-152.ec2.internal:3000.
 *
 * Resolution order:
 *   1. PUBLIC_BASE_URL, set on the service. Cannot be influenced by a client,
 *      so it is preferred wherever it is readable.
 *   2. X-Forwarded-Host / -Proto, injected by CloudFront as origin custom
 *      headers. Needed in the proxy, which cannot read runtime env vars.
 *   3. The request itself — correct locally, where there is no proxy in front.
 */
export function absoluteUrl(path: string, request: NextRequest): URL {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return new URL(path, configured);

  const host = request.headers.get("x-forwarded-host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return new URL(path, `${proto}://${host}`);
  }

  return new URL(path, request.nextUrl);
}
