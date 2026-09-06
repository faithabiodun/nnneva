"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateProfile } from "@/app/actions/app";

type Step = {
  eyebrow: string;
  title: string;
  body: string;
  /** A small drawn scene rather than a screenshot, which would go stale. */
  art: React.ReactNode;
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const STEPS: Step[] = [
  {
    eyebrow: "Welcome",
    title: "Nnneva does the work, not just the talking",
    body: "Tell it what you need and it books, reminds, prepares and remembers. You should never have to explain your pregnancy twice.",
    art: (
      <g {...STROKE}>
        <circle cx="32" cy="26" r="13" />
        <path d="M32 19v8l5 3" />
        <path d="M12 52c3-8 10-12 20-12s17 4 20 12" />
      </g>
    ),
  },
  {
    eyebrow: "Asking",
    title: "Questions get answered. Instructions get done.",
    body: "“What is a glucose test?” is answered and nothing else happens. “Book my glucose test” creates the task and the reminder. Nnneva will not put things on your list that you did not ask for.",
    art: (
      <g {...STROKE}>
        <path d="M10 14h30a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-8 7v-7h-4a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
        <path d="M24 21h12M24 27h8" />
        <path d="M46 40h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-2v5l-6-5h-8" />
      </g>
    ),
  },
  {
    eyebrow: "Chat history",
    title: "Every conversation is kept, and can be picked up",
    body: "Threads are grouped by day. Open an old one and carry on — Nnneva remembers what you both said, so “book it for then” still means something a week later.",
    art: (
      <g {...STROKE}>
        <rect x="8" y="12" width="20" height="40" rx="3" />
        <rect x="34" y="12" width="22" height="40" rx="3" />
        <path d="M13 20h10M13 27h10M13 34h7" />
        <path d="M39 22h12M39 29h12M39 36h8" />
      </g>
    ),
  },
  {
    eyebrow: "Your say-so",
    title: "Nothing leaves your account without you",
    body: "Sharing anything with a trusted contact needs your approval, every single time — not once at setup. Anything waiting on you appears beside Nnneva in the sidebar.",
    art: (
      <g {...STROKE}>
        <path d="M32 8l18 7v14c0 12-8 20-18 24-10-4-18-12-18-24V15l18-7Z" />
        <path d="M24 31l6 6 12-12" />
      </g>
    ),
  },
  {
    eyebrow: "Yours to shape",
    title: "Change anything, any time",
    body: "Your due date, clinic, avatar and whether Nnneva runs light or dark all live in Profile. What it is allowed to handle is yours to set, and to change.",
    art: (
      <g {...STROKE}>
        <circle cx="32" cy="24" r="9" />
        <path d="M14 52c2-9 9-14 18-14s16 5 18 14" />
        <circle cx="47" cy="15" r="6" />
        <path d="M47 12v6l3 2" />
      </g>
    ),
  },
];

/**
 * The first-run walkthrough.
 *
 * Deliberately a modal rather than spotlights pinned to real elements: the
 * sidebar is a drawer below lg and a column above it, so anchored coach-marks
 * would point at nothing on a phone — which is where most of this will be read.
 *
 * Whether it has been seen is stored on the account, so it does not reappear on
 * a second device, and marking it seen is one-way.
 */
export function WelcomeTour({ name }: { name: string }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();

  const finish = () => {
    setDone(true);
    startTransition(async () => {
      await updateProfile({ tour_seen: true });
      router.refresh();
    });
  };

  // Escape closes it. A tour you cannot dismiss is a hostage situation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/55 px-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="animate-rise w-full max-w-[460px] rounded-[22px] bg-white p-7 shadow-[0_20px_60px_rgba(11,44,34,0.22)]">
        <div className="mb-5 grid h-[104px] place-items-center rounded-[16px] bg-green-tint text-green-ink">
          <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
            {step.art}
          </svg>
        </div>

        <p className="text-[11.5px] tracking-[0.13em] text-pink-ink uppercase">{step.eyebrow}</p>
        <h2
          id="tour-title"
          className="mt-2 font-display text-[22px] leading-[1.2] font-semibold text-ink"
        >
          {i === 0 ? `${step.title}, ${name.split(" ")[0]}` : step.title}
        </h2>
        <p className="mt-2.5 text-small text-muted">{step.body}</p>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  n === i ? "w-5 bg-green" : "w-1.5 bg-surface-3"
                }`}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!last && (
              <button
                type="button"
                onClick={finish}
                className="px-2 py-2 text-caption text-faint transition-colors hover:text-muted"
              >
                Skip
              </button>
            )}
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI((n) => n - 1)}
                className="px-2 py-2 text-caption text-muted transition-colors hover:text-ink"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setI((n) => n + 1))}
              className="rounded-pill bg-ink px-5 py-2.5 text-caption font-medium text-canvas transition-colors hover:bg-green-deep"
            >
              {last ? "Start using Nnneva" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
