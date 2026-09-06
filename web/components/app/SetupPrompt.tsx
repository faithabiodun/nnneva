"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/**
 * Shown across the signed-in app until the pregnancy context exists.
 *
 * Signing in with Google creates an account without it, so someone can reach
 * Home with no due date and see a product that looks broken — empty week
 * count, no timeline, an agent with nothing to reason from. This says why, and
 * offers both routes: the guided wizard, or the profile for anyone who would
 * rather fill in one field.
 *
 * Dismissal is per-browser and deliberately not persisted to the account: the
 * prompt should come back on the next device, because the app really is
 * missing the thing it needs.
 */
const DISMISSED_KEY = "nnneva_setup_prompt_dismissed";

/* The dismissal lives in localStorage, which React cannot see. Reading it
   during render would disagree with the server-rendered HTML, so it is
   modelled as what it is — an external store React subscribes to. The server
   snapshot says "dismissed" so nothing renders until hydration is done. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Private browsing, or storage blocked. Showing it is the safer default.
    return false;
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Not being able to remember the dismissal is not worth an error.
  }
  for (const listener of listeners) listener();
}

export function SetupPrompt({ onboarded }: { onboarded: boolean }) {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

  if (onboarded || dismissed) return null;

  return (
    <div
      role="status"
      className="mb-4.5 flex flex-col gap-3 rounded-[14px] border border-line bg-green-tint px-4.5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-[14.5px] font-medium text-ink">Finish setting up Nnneva</p>
        <p className="mt-1 text-caption text-muted">
          Add your due date and care details so Nnneva can track your week, prepare for
          appointments and time reminders properly.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/onboarding"
          className="rounded-md bg-green px-3.5 py-2 text-caption font-medium text-white transition-colors hover:bg-green-deep"
        >
          Add details
        </Link>
        <Link
          href="/profile"
          className="rounded-md px-3 py-2 text-caption text-muted transition-colors hover:text-ink"
        >
          In profile
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this reminder"
          className="rounded-md px-2 py-2 text-caption text-faint transition-colors hover:text-muted"
        >
          Later
        </button>
      </div>
    </div>
  );
}
