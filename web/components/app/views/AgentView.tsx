"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { answerApproval, askNnneva } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { CardLabel } from "@/components/app/Bits";
import { PlanTimeline, stepsForRun } from "@/components/app/PlanTimeline";
import type { AgentRun, RunStatus } from "@/lib/types";

/** How long one plan step takes to land. Slow enough to read as it appears. */
const STEP_MS = 420;

const RUN_TONE: Record<RunStatus, string> = {
  complete: "bg-green-wash text-green-ink",
  running: "bg-pink-wash text-pink-ink-deep",
  awaiting_approval: "bg-pink-wash text-pink-ink-deep",
  escalated: "bg-danger-wash text-danger",
  failed: "bg-surface-2 text-muted",
};

const RUN_LABEL: Record<RunStatus, string> = {
  complete: "Complete",
  running: "Running",
  awaiting_approval: "Waiting on you",
  escalated: "Escalated",
  failed: "Failed",
};

const SUGGESTIONS = [
  "I have an antenatal appointment next Thursday. Help me prepare questions and get my blood test done.",
  "What is still unfinished?",
  "Remind me to collect my results on Friday",
];

export function AgentView({
  initialRun,
  greetingName,
}: {
  initialRun: AgentRun | null;
  greetingName: string;
}) {
  const [run, setRun] = useState<AgentRun | null>(initialRun);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thinking, startThinking] = useTransition();
  const [, startAnswering] = useTransition();

  // Steps are revealed one at a time after the run returns. The work is already
  // done by then — this is pacing so the plan can be read as it builds, not a
  // fake progress bar.
  const [revealed, setRevealed] = useState(
    initialRun ? initialRun.plan_steps.length || initialRun.actions.length : 0,
  );

  useEffect(() => {
    if (!run) return;
    const total = run.plan_steps.length || run.actions.length;
    if (revealed >= total) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [run, revealed]);


  const send = (message: string) => {
    const text = message.trim();
    if (!text || thinking) return;
    setError(null);
    setDraft("");
    setRevealed(0);
    startThinking(async () => {
      try {
        setRun(await askNnneva(text));
      } catch {
        setError("Nnneva could not finish that. Please try again.");
      }
    });
  };

  const decide = (approvalId: string, approve: boolean) => {
    startAnswering(async () => {
      await answerApproval(approvalId, approve);
      setRun((prev) =>
        prev
          ? {
              ...prev,
              status: "complete",
              approvals: prev.approvals.map((a) =>
                a.id === approvalId
                  ? { ...a, status: approve ? "approved" : "declined" }
                  : a,
              ),
              plan_steps: prev.plan_steps.map((s) =>
                s.state === "approval"
                  ? {
                      ...s,
                      state: approve ? "approved" : "declined",
                      detail: approve
                        ? "You allowed this once."
                        : "You declined. Nothing was shared.",
                    }
                  : s,
              ),
            }
          : prev,
      );
    });
  };

  // An escalated run creates no goal, so it has no plan rows — but it did take
  // actions, and those are the honest record of what happened. Falling back to
  // them stops the panel sitting on "Reading your context…" forever.
  const allSteps = run ? stepsForRun(run) : [];
  const steps = allSteps.slice(0, revealed);
  const pending = run?.approvals.find((a) => a.status === "pending");
  const escalated = run?.status === "escalated";

  return (
    <AppShell title="Nnneva" subtitle="Tell it what you need and watch the plan build">
      <div className="flex flex-col gap-4.5 xl:flex-row xl:items-start">
        {/* ---- Conversation ------------------------------------------------ */}
        <section className="card flex min-h-[560px] min-w-0 flex-1 flex-col xl:h-[calc(100dvh-150px)]">
          <Transcript
            run={run}
            thinking={thinking}
            escalated={escalated}
            greetingName={greetingName}
          />

          <div className="flex flex-col gap-2.5 border-t border-line px-5.5 pt-4 pb-5">
            {error && (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            )}
            {!run && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={thinking}
                    className="rounded-pill bg-surface px-3.5 py-2.5 text-left text-caption text-muted transition-colors hover:bg-surface-3 disabled:opacity-60"
                  >
                    {s.length > 60 ? `${s.slice(0, 58)}…` : s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-center gap-2.5 rounded-lg bg-surface p-1.5 pl-4.5"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <label htmlFor="ask" className="sr-only">
                Tell Nnneva what you need
              </label>
              <input
                id="ask"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={thinking}
                className="min-w-0 flex-1 bg-transparent py-3 text-body text-ink-2 outline-none placeholder:text-faint disabled:opacity-60"
                placeholder="Tell Nnneva what you need"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={thinking || !draft.trim()}
                className="grid size-10 shrink-0 place-items-center rounded-md bg-pink text-white transition-colors hover:bg-pink-deep disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                  <path
                    d="M5 12h13M12 5.5 18.5 12 12 18.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          </div>
        </section>

        {/* ---- What it is doing, and why ----------------------------------- */}
        <div className="flex w-full min-w-0 flex-col gap-4 xl:max-w-[430px] xl:flex-1">
          <section className="card p-5.5">
            <CardLabel>Current goal</CardLabel>
            <p className="mt-2.5 text-[16px] leading-[1.45] text-ink">
              {run ? run.prompt : "Nothing running. Describe something and Nnneva will plan it."}
            </p>
            {run && (
              <p className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <span className={`pill ${RUN_TONE[run.status]}`}>{RUN_LABEL[run.status]}</span>
                <span className="text-caption text-faint">
                  {allSteps.length} step{allSteps.length === 1 ? "" : "s"}
                  {run.duration_ms !== null && ` · ${Math.round(run.duration_ms)} ms`}
                  {" · "}
                  {/* Never inferred: the server records which planner ran. */}
                  {run.engine === "bedrock" ? "model" : "rules"}
                </span>
              </p>
            )}
          </section>

          {run && (
            <section className="card p-5.5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <CardLabel>Agent plan</CardLabel>
                <span className="tnum text-caption text-faint">
                  {steps.length} of {allSteps.length}
                </span>
              </div>
              <PlanTimeline steps={steps} />
            </section>
          )}

          {pending && revealed >= allSteps.length && (
            <section className="animate-rise rounded-lg bg-pink-wash p-5.5">
              <CardLabel>
                <span className="text-pink-ink-deep">Needs your approval</span>
              </CardLabel>
              <p className="mt-2.5 text-body text-ink">{pending.question}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => decide(pending.id, true)} className="btn btn-pink">
                  Allow once
                </button>
                <button
                  type="button"
                  onClick={() => decide(pending.id, false)}
                  className="btn bg-white text-ink hover:bg-surface"
                >
                  Not now
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Transcript({
  run,
  thinking,
  escalated,
  greetingName,
}: {
  run: AgentRun | null;
  thinking: boolean;
  escalated: boolean;
  greetingName: string;
}) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [run, thinking]);

  return (
    <div className="scroll-y flex flex-1 flex-col gap-4.5 p-6 px-6.5">
      {!run && !thinking && (
        <p className="m-auto max-w-[420px] text-center text-body text-muted">
          Hello {greetingName}. Describe something messy in your own words — an appointment to
          prepare for, a test to arrange — and Nnneva will turn it into a plan and do the parts it
          is allowed to do.
        </p>
      )}

      {run && (
        <div className="animate-rise flex justify-end">
          <p className="max-w-[76%] rounded-[18px] rounded-br-[6px] bg-ink px-4.5 py-3.5 text-body whitespace-pre-line text-white">
            {run.prompt}
          </p>
        </div>
      )}

      {run && !thinking && (
        <div
          className={`animate-rise flex justify-start ${escalated ? "w-full" : ""}`}
          role={escalated ? "alert" : undefined}
        >
          {escalated ? (
            <div className="w-full rounded-[18px] bg-danger-wash p-5.5">
              <p className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" aria-hidden>
                  <path
                    d="M12 4.5 21 20H3zM12 10v4M12 17h.01"
                    stroke="#B3261E"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="eyebrow text-danger">Automation paused</span>
              </p>
              <p className="mt-3 text-body leading-[1.6] whitespace-pre-line text-[#3C1A17]">
                {run.reply}
              </p>
              <p className="mt-4 text-caption leading-[1.5] text-[#8A5A54]">
                Nnneva cannot diagnose. This is guidance to help you reach care quickly.
              </p>
            </div>
          ) : (
            <p className="max-w-[76%] rounded-[18px] rounded-bl-[6px] bg-surface px-4.5 py-3.5 text-body whitespace-pre-line text-ink-2">
              {run.reply}
            </p>
          )}
        </div>
      )}

      {thinking && (
        <p className="animate-fade flex items-center gap-3">
          <span className="animate-pulse-soft size-2 rounded-full bg-pink" aria-hidden />
          <span className="text-small text-muted-2">Nnneva is working on it</span>
        </p>
      )}

      <div ref={end} />
    </div>
  );
}
