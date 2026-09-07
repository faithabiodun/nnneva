"use client";

import { useEffect } from "react";

/**
 * The last line of defence for the signed-in app.
 *
 * A server component that throws — most often because an API call failed —
 * otherwise renders Next's default 500 page, which is a stack trace in
 * development and a blank apology in production. Neither is something to show
 * someone who came here to check when their next appointment is.
 *
 * Deliberately vague about the cause. The person reading this cannot act on
 * "404 from /contacts"; they can act on "try again" and "here is the way
 * back". The real error still reaches the server logs through the console
 * call below.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Screen failed to render:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <section className="card max-w-[520px] p-7">
        <h1 className="font-display text-[22px] text-ink">That screen did not load</h1>
        <p className="mt-2.5 text-small leading-[1.6] text-muted">
          Something went wrong on our side, not yours. Nothing you have saved is affected —
          your tasks, appointments and messages are all still there.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={reset} className="btn btn-ink">
            Try again
          </button>
          <a href="/home" className="text-caption text-muted transition-colors hover:text-ink">
            Back to home
          </a>
        </div>
        {error.digest && (
          <p className="mt-5 text-caption text-faint">Reference: {error.digest}</p>
        )}
      </section>
    </main>
  );
}
