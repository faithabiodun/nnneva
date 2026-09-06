"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { askNnneva } from "@/app/actions/app";
import { PlanTimeline, stepsForRun } from "@/components/app/PlanTimeline";
import type { AgentRun } from "@/lib/types";

/**
 * Openers that show what the agent is for without needing to be read first.
 *
 * Each one was checked against a brand-new account, because that is what a
 * first-time visitor has. The obvious phrasings — "get me ready for my next
 * appointment", "what should I do this week" — dead-end on an empty diary:
 * there is no appointment to prepare for yet, and the reply is an apology.
 * These state a fact the agent can act on, so the first thing anyone sees it
 * do is real work rather than a shrug.
 */
const SUGGESTIONS = [
  "I have an antenatal appointment next Tuesday at 10am",
  "Book my blood test and remind me to fast",
  "My scan is next Friday — help me prepare",
];

const STEP_MS = 420;

/**
 * The agent, on Home.
 *
 * Nnneva's whole argument is that it does work rather than answers questions,
 * so the agent belongs where people land, not behind a tab they have to find.
 * This runs a real goal against the real tools and shows the plan forming; the
 * full transcript, tool detail and approvals live on /agent.
 */
export function HomeAgent({ onboarded }: { onboarded: boolean }) {
  const [message, setMessage] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thinking, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Steps appear one at a time. It is paced off the real steps rather than a
  // fake progress bar: nothing is shown that the agent did not actually do.
  const [revealed, setRevealed] = useState(0);
  const allSteps = run ? stepsForRun(run) : [];
  const steps = allSteps.slice(0, revealed);

  useEffect(() => {
    if (!run || revealed >= allSteps.length) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [run, revealed, allSteps.length]);

  const send = (text: string) => {
    const goal = text.trim();
    if (!goal || thinking) return;
    setError(null);
    setRun(null);
    setRevealed(0);
    setMessage("");
    startTransition(async () => {
      try {
        setRun(await askNnneva(goal));
      } catch {
        setError("Nnneva could not finish that just now. Please try again.");
      }
    });
  };

  return (
    <section className="card mt-5 p-5.5">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="size-2 shrink-0 rounded-full bg-pink" aria-hidden />
        <h2 className="card-title">Ask Nnneva to do something</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(message);
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <label htmlFor="home-agent" className="sr-only">
          What would you like Nnneva to do?
        </label>
        <input
          id="home-agent"
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={thinking}
          placeholder="Describe what you need done"
          className="min-w-0 flex-1 rounded-md bg-surface px-4 py-3 text-small text-ink outline-none transition-shadow focus:ring-2 focus:ring-green disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={thinking || !message.trim()}
          className="rounded-md bg-green px-5 py-3 text-small font-medium text-white transition-colors hover:bg-green-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {thinking ? "Working…" : "Send"}
        </button>
      </form>

      {!run && !thinking && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => send(s)}
                className="pill bg-surface text-caption text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!onboarded && !run && (
        <p className="mt-3 text-caption text-faint">
          Nnneva works better once it knows your due date — it can still help without it.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3.5 rounded-md bg-danger-wash px-3.5 py-2.5 text-caption text-danger">
          {error}
        </p>
      )}

      {thinking && (
        <p className="mt-3.5 text-caption text-muted" role="status">
          Reading your context…
        </p>
      )}

      {run && (
        <div className="mt-4.5 border-t border-line pt-4.5">
          <p className="text-body text-ink-2">{run.reply}</p>

          {steps.length > 0 && (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="eyebrow text-faint">Agent plan</p>
                <span className="tnum text-caption text-faint">
                  {steps.length} of {allSteps.length}
                </span>
              </div>
              <PlanTimeline steps={steps} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/agent" className="text-caption text-pink-ink hover:text-pink-ink-deep">
              Open the full run
            </Link>
            {/* Which planner actually ran. Recorded by the server, never guessed:
                a run that fell back to the rule-based planner should not be able
                to pass itself off as the model's work. */}
            <span className="pill bg-surface text-caption text-faint">
              {run.engine === "bedrock" ? "Claude via Bedrock" : "Rule-based planner"}
            </span>
            {run.approvals.length > 0 && (
              <Link href="/agent" className="pill bg-pink-wash text-caption text-pink-ink-deep">
                {run.approvals.length} waiting on you
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
