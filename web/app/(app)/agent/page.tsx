"use client";

import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { CardLabel } from "@/components/app/Bits";
import {
  APPROVAL_TEXT,
  FLAG_MESSAGE,
  FLAG_PLAN,
  FLAG_SUGGESTIONS,
  PREP_MESSAGE,
  PREP_PLAN,
  PREP_REPLY,
  PREP_SUGGESTIONS,
  type PlanStep,
  type StepState,
} from "@/lib/app-data";

/** How long one plan step takes to land. Slow enough to read as it appears. */
const STEP_MS = 650;

type Scenario = "prep" | "flag";
type Answer = "pending" | "approved" | "declined";

/** Icon and colour for each step state. */
const STATE_ART: Record<StepState, { dot: string; fg: string; path: string }> = {
  done: { dot: "bg-green-wash", fg: "#1F6B54", path: "m5 12.5 4.5 4.5L19 7" },
  approved: { dot: "bg-green-wash", fg: "#1F6B54", path: "m5 12.5 4.5 4.5L19 7" },
  approval: { dot: "bg-[#FCE4EC]", fg: "#D62B60", path: "M12 7v6M12 16.5h.01" },
  declined: { dot: "bg-[#F1EDEA]", fg: "#9AAAA3", path: "M7 7l10 10M17 7 7 17" },
  flag: { dot: "bg-danger-wash", fg: "#B3261E", path: "M12 7v6M12 16.5h.01" },
  stopped: { dot: "bg-danger-wash", fg: "#B3261E", path: "M8 8h8v8H8z" },
};

export default function AgentPage() {
  const [scenario, setScenario] = useState<Scenario>("prep");
  const [phase, setPhase] = useState(0);
  const [answer, setAnswer] = useState<Answer>("pending");
  const [runId, setRunId] = useState(0);

  const prep = scenario === "prep";
  const source = prep ? PREP_PLAN : FLAG_PLAN;
  // One phase to show the message, then one per step, then one to land the reply.
  const maxPhase = source.length + (prep ? 3 : 3);

  // The run is a timer, not a reaction to state: each tick reveals one more plan
  // step. Resetting happens in the handlers below so the effect only ever owns
  // the interval.
  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => {
        if (p >= maxPhase) {
          clearInterval(id);
          return p;
        }
        return p + 1;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [runId, maxPhase]);

  const replay = () => {
    setAnswer("pending");
    setPhase(0);
    setRunId((n) => n + 1);
  };

  const pick = (next: Scenario) => {
    if (next === scenario) return;
    setScenario(next);
    setAnswer("pending");
    setPhase(0);
    setRunId((n) => n + 1);
  };

  const visible = Math.min(Math.max(phase - 1, 0), source.length);
  const steps = source.slice(0, visible).map((step) => resolve(step, answer));
  const running = phase >= 1 && phase < maxPhase;
  const complete = phase >= maxPhase;
  const escalated = !prep && visible >= FLAG_PLAN.length;
  const needsApproval = prep && visible >= 5 && answer === "pending";

  return (
    <AppShell
      title="Nnneva"
      subtitle="Give it a goal and watch the plan build"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="flex flex-col gap-4.5 xl:flex-row xl:items-start">
        {/* ---- Conversation ------------------------------------------------ */}
        <section className="card flex min-h-[560px] min-w-0 flex-1 flex-col xl:h-[calc(100dvh-150px)]">
          <div className="flex items-center gap-3 p-4 px-5.5">
            <div className="flex rounded-md bg-surface p-[3px]" role="group" aria-label="Scenario">
              {(["prep", "flag"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={scenario === s}
                  onClick={() => pick(s)}
                  className={`rounded-[8px] px-3.5 py-2 text-caption transition-colors ${
                    scenario === s ? "bg-white text-ink" : "text-muted-2 hover:text-ink"
                  }`}
                >
                  {s === "prep" ? "Appointment prep" : "Red flag"}
                </button>
              ))}
            </div>
            <button type="button" onClick={replay} className="btn btn-quiet ml-auto gap-2 !px-4 !py-2.5">
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
                <path
                  d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Replay
            </button>
          </div>
          <div className="h-px bg-surface-2" />

          <Transcript
            key={runId}
            prep={prep}
            phase={phase}
            running={running}
            complete={complete}
            escalated={escalated}
          />

          <div className="flex flex-col gap-2.5 px-5.5 pt-4 pb-5">
            <div className="flex flex-wrap gap-2">
              {(prep ? PREP_SUGGESTIONS : FLAG_SUGGESTIONS).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-pill bg-surface px-3.5 py-2.5 text-caption text-muted transition-colors hover:bg-surface-3"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2.5 rounded-lg bg-surface p-1.5 pl-4.5"
              onSubmit={(e) => {
                e.preventDefault();
                replay();
              }}
            >
              <label htmlFor="ask" className="sr-only">
                Tell Nnneva what you need
              </label>
              <input
                id="ask"
                className="min-w-0 flex-1 bg-transparent py-3 text-body text-ink-2 outline-none placeholder:text-faint"
                placeholder="Tell Nnneva what you need"
              />
              <button
                type="submit"
                aria-label="Send"
                className="grid size-10 shrink-0 place-items-center rounded-md bg-pink text-white transition-colors hover:bg-pink-deep"
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
              {prep
                ? "Prepare for Thursday's antenatal appointment and complete the blood test"
                : "Add a symptom note to Thursday's appointment"}
            </p>
            <p className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <span className={`pill ${runTone(prep, complete, escalated)}`}>
                {prep ? (complete ? "Complete" : "Running") : escalated ? "Escalated" : "Running"}
              </span>
              <span className="text-caption text-faint">
                {prep ? "Run 418 · 6 steps" : "Run 419 · safety path"}
              </span>
            </p>
          </section>

          <section className="card p-5.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <CardLabel>Agent plan</CardLabel>
              <span className="tnum text-caption text-faint">
                {visible} of {source.length}
              </span>
            </div>
            <ol className="flex flex-col">
              {steps.map((step, i) => {
                const art = STATE_ART[step.state];
                return (
                  <li key={step.title} className="animate-rise flex gap-3.5">
                    <span className="flex flex-none flex-col items-center">
                      <span className={`grid size-5.5 place-items-center rounded-full ${art.dot}`}>
                        <svg viewBox="0 0 24 24" className="size-3" fill="none" aria-hidden>
                          <path
                            d={art.path}
                            stroke={art.fg}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {i < steps.length - 1 && <span className="my-1 w-0.5 flex-1 bg-surface-3" />}
                    </span>
                    <span className="min-w-0 pb-4">
                      <span className="block text-small text-ink">{step.title}</span>
                      <span className="mt-1 block text-caption text-muted-2">{step.detail}</span>
                    </span>
                  </li>
                );
              })}
              {steps.length === 0 && (
                <li className="text-caption text-faint">Reading your context…</li>
              )}
            </ol>
          </section>

          {needsApproval && (
            <section className="animate-rise rounded-lg bg-pink-wash p-5.5">
              <CardLabel>
                <span className="text-pink-deep">Needs your approval</span>
              </CardLabel>
              <p className="mt-2.5 text-body text-ink">{APPROVAL_TEXT}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => setAnswer("approved")} className="btn btn-pink">
                  Allow once
                </button>
                <button
                  type="button"
                  onClick={() => setAnswer("declined")}
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

/** Rewrites the approval step once she has answered it. */
function resolve(step: PlanStep, answer: Answer): PlanStep {
  if (step.state !== "approval" || answer === "pending") return step;
  return answer === "approved"
    ? { ...step, state: "approved", detail: "You allowed this once. Reminder shared with Chidi." }
    : { ...step, state: "declined", detail: "You declined. Nothing was shared." };
}

function runTone(prep: boolean, complete: boolean, escalated: boolean) {
  if (!prep) return escalated ? "bg-danger-wash text-danger" : "bg-pink-wash text-pink-deep";
  return complete ? "bg-green-wash text-green" : "bg-pink-wash text-pink-deep";
}

function Transcript({
  prep,
  phase,
  running,
  complete,
  escalated,
}: {
  prep: boolean;
  phase: number;
  running: boolean;
  complete: boolean;
  escalated: boolean;
}) {
  const end = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view as the run lands, but scroll only this pane.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [phase]);

  return (
    <div className="scroll-y flex flex-1 flex-col gap-4.5 p-6 px-6.5">
      {phase >= 1 && (
        <div className="animate-rise flex justify-end">
          <p className="max-w-[76%] rounded-[18px] rounded-br-[6px] bg-ink px-4.5 py-3.5 text-body whitespace-pre-line text-white">
            {prep ? PREP_MESSAGE : FLAG_MESSAGE}
          </p>
        </div>
      )}

      {prep && complete && (
        <div className="animate-rise flex justify-start">
          <p className="max-w-[76%] rounded-[18px] rounded-bl-[6px] bg-surface px-4.5 py-3.5 text-body whitespace-pre-line text-ink-2">
            {PREP_REPLY}
          </p>
        </div>
      )}

      {running && (
        <p className="animate-fade flex items-center gap-3">
          <span className="animate-pulse-soft size-2 rounded-full bg-pink" aria-hidden />
          <span className="text-small text-muted-2">
            {prep
              ? "Nnneva is planning your appointment"
              : "Nnneva is checking this for red flags"}
          </span>
        </p>
      )}

      {!prep && escalated && (
        <div className="animate-rise rounded-[18px] bg-danger-wash p-5.5" role="alert">
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
          <p className="mt-3 text-body leading-[1.6] text-[#3C1A17]">
            Severe headache with visual changes in the third trimester can be a sign of
            pre-eclampsia. This needs to be assessed by a clinician now. Nnneva has stopped creating
            tasks and reminders until you confirm you have been seen.
          </p>
          <div className="mt-4.5 flex flex-wrap gap-2.5">
            <a href="tel:+2348035550142" className="btn bg-danger text-white hover:bg-[#8E1E17]">
              Call Lagoon Clinic
            </a>
            <button type="button" className="btn bg-white text-[#3C1A17] hover:bg-canvas">
              Message Chidi
            </button>
            <button type="button" className="btn bg-white text-[#3C1A17] hover:bg-canvas">
              What to watch for
            </button>
          </div>
          <p className="mt-4 text-caption leading-[1.5] text-[#8A5A54]">
            Nnneva cannot diagnose. This is guidance to help you reach care quickly.
          </p>
        </div>
      )}

      <div ref={end} />
    </div>
  );
}
