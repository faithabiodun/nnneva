import "server-only";

import { redirect } from "next/navigation";

import { readSession } from "@/lib/session";

/**
 * The server-side API client.
 *
 * Nothing here ever runs in the browser: `server-only` makes importing it from
 * a client component a build error, so the session token cannot leak into the
 * bundle by accident.
 */

const BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Send the request signed out. Only sign-up and sign-in need this. */
  anonymous?: boolean;
};

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body, anonymous = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!anonymous) {
    const token = await readSession();
    if (!token) redirect("/login");
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Every page is per-user and changes as the agent works, so nothing here
      // is cacheable.
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiError(0, `Could not reach the API at ${BASE}. Is it running?`, { cause });
  }

  if (response.status === 401 && !anonymous) {
    // The token expired or was revoked. Sending them back to sign in is more
    // useful than an error page.
    redirect("/login?expired=1");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** FastAPI puts the message in `detail`, which is a string or a list of issues. */
async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail.map((d: { msg?: string }) => d.msg ?? "Invalid value").join(". ");
    }
  } catch {
    // Not JSON — fall through to the status text.
  }
  return response.statusText || `Request failed (${response.status})`;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, anonymous = false) =>
    request<T>(path, { method: "POST", body, anonymous }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/**
 * Next signals control flow by throwing. redirect(), notFound() and the
 * dynamic-rendering probe all raise, and each carries a digest naming itself.
 * None of them is a failure, and every one has to pass through a catch that
 * is only meant to absorb a broken API call.
 *
 * The dynamic one matters most here. During the production build Next renders
 * each route once to see whether it can be static; reading cookies throws
 * DYNAMIC_SERVER_USAGE, which is how it learns the answer is no. Swallowing
 * that would answer yes — and ship a statically cached empty page to
 * everyone, which is a far worse bug than the error this helper exists to
 * avoid.
 */
function isControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE")
  );
}

/**
 * Runs a read and falls back rather than throwing, so a screen whose list
 * could not load renders empty instead of becoming an error page.
 *
 * Reads only. A write that silently "succeeded" would be far worse than an
 * error, so nothing here is used for POST, PATCH or DELETE.
 */
export async function orFallback<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (isControlFlow(error)) throw error;
    console.error("Read failed; falling back to an empty state:", error);
    return fallback;
  }
}
