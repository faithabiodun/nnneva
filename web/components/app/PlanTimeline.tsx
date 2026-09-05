"use client";

import type { ActionResult, AgentAction, AgentRun, PlanState, PlanStep } from "@/lib/types";

/** How each plan state is drawn: the dot's tint, the mark, and its colour. */
export const STATE_ART: Record<PlanState, { dot: string; fg: string; path: string }> = {
  done: { dot: "bg-green-wash", fg: "#1F6B54", path: "m5 12.5 4.5 4.5L19 7" },
  approved: { dot: "bg-green-wash", fg: "#1F6B54", path: "m5 12.5 4.5 4.5L19 7" },
  approval: { dot: "bg-[#FCE4EC]", fg: "#B01F4C", path: "M12 7v6M12 16.5h.01" },
  declined: { dot: "bg-[#F1EDEA]", fg: "#66716C", path: "M7 7l10 10M17 7 7 17" },
  flag: { dot: "bg-danger-wash", fg: "#B3261E", path: "M12 7v6M12 16.5h.01" },
  stopped: { dot: "bg-danger-wash", fg: "#B3261E", path: "M8 8h8v8H8z" },
};

/** How a tool result reads as a plan step, for runs that produced no plan. */
const STATE_FOR_RESULT: Record<ActionResult, PlanState> = {
  ok: "done",
  blocked: "flag",
  awaiting_approval: "approval",
  failed: "stopped",
};

/**
 * The steps to draw for a run.
 *
 * An escalated run has no goal, so it has no plan rows — but it did take
 * actions, and showing nothing would leave the screen reading "thinking…"
 * forever. The tool actions stand in for the plan in that case.
 */
export function stepsForRun(run: AgentRun): PlanStep[] {
  if (run.plan_steps.length > 0) return run.plan_steps;
  return run.actions.map((a: AgentAction, i) => ({
    step_index: i,
    title: a.summary,
    detail: a.detail || a.result_label,
    state: STATE_FOR_RESULT[a.result],
  }));
}

/**
 * The agent's plan as a vertical timeline.
 *
 * Shared by the agent screen and Home so the same run never looks like two
 * different things depending on where it is read.
 */
export function PlanTimeline({ steps }: { steps: PlanStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const art = STATE_ART[step.state];
        return (
          <li key={step.step_index} className="animate-rise flex gap-3.5">
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
              {step.detail && (
                <span className="mt-1 block text-caption text-muted-2">{step.detail}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
