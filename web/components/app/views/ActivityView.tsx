"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { FilterChips } from "@/components/app/Bits";
import { timeOfDay } from "@/lib/format";
import type { ActivityDay, AgentAction, RunStatus, SafetyBand } from "@/lib/types";

const FILTERS = ["All", "Actions", "Approvals", "Safety"] as const;
type Filter = (typeof FILTERS)[number];

/** An approval is still open, so it keeps the clock face and the pink result. */
const ART = {
  ok: { bg: "bg-[#E9F2EC]", fg: "#1F6B54", path: "m5 12.5 4.5 4.5L19 7" },
  safety: {
    bg: "bg-[#E9F2EC]",
    fg: "#1F6B54",
    path: "M12 3.5 5 6.5v5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9v-5zM9.2 12l2 2 3.6-3.8",
  },
  awaiting_approval: {
    bg: "bg-pink-wash",
    fg: "#B01F4C",
    path: "M12 12V7.5M12 12l3 2M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z",
  },
  blocked: {
    bg: "bg-danger-wash",
    fg: "#B3261E",
    path: "M12 4.5 21 20H3zM12 10v4M12 17h.01",
  },
  failed: { bg: "bg-surface-2", fg: "#66716C", path: "M7 7l10 10M17 7 7 17" },
};

function artFor(action: AgentAction) {
  if (action.result === "ok" && action.tool === "safety_check") return ART.safety;
  return ART[action.result] ?? ART.ok;
}

const RUN_TONE: Record<RunStatus, { dot: string; pill: string }> = {
  complete: { dot: "bg-green", pill: "bg-green-wash text-green" },
  running: { dot: "bg-green-mid", pill: "bg-surface-2 text-muted" },
  awaiting_approval: { dot: "bg-pink", pill: "bg-pink-wash text-pink-deep" },
  escalated: { dot: "bg-danger", pill: "bg-danger-wash text-danger" },
  failed: { dot: "bg-faint", pill: "bg-surface-2 text-muted" },
};

const RUN_LABEL: Record<RunStatus, string> = {
  complete: "Complete",
  running: "Running",
  awaiting_approval: "1 approval pending",
  escalated: "Escalated",
  failed: "Failed",
};

const BAND_LABEL: Record<SafetyBand, string> = {
  none: "No flags",
  routine: "Noted for the next visit",
  same_day: "Needs care today",
  emergency: "Emergency escalation",
};

export function ActivityView({ days }: { days: ActivityDay[] }) {
  const [filter, setFilter] = useState<Filter>("All");

  // Filtering narrows the actions inside each run, then drops runs and days that
  // end up empty — the log should never show a heading over nothing.
  const shown = useMemo(() => {
    if (filter === "All") return days;
    const keep = (a: AgentAction) => {
      if (filter === "Approvals") return a.result === "awaiting_approval" || a.tool === "share_with_contact";
      if (filter === "Safety") return a.tool === "safety_check" || a.tool === "output_guardrail";
      return a.result === "ok" && a.tool !== "safety_check";
    };
    return days
      .map((d) => ({
        ...d,
        runs: d.runs
          .map((r) => ({ ...r, actions: r.actions.filter(keep) }))
          .filter((r) => r.actions.length > 0),
      }))
      .filter((d) => d.runs.length > 0);
  }, [days, filter]);

  return (
    <AppShell title="Agent activity" subtitle="Everything Nnneva did, and why">
      <div className="max-w-[900px]">
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          label="Filter activity"
        />

        <div className="mt-5 flex flex-col gap-5.5">
          {shown.map((day) => (
            <section key={day.label}>
              <h2 className="eyebrow mb-3 text-faint">{day.label}</h2>
              <div className="flex flex-col gap-3">
                {day.runs.map((r) => {
                  const tone = RUN_TONE[r.status];
                  return (
                    <article key={r.id} className="card p-5.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className={`size-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
                        <h3 className="card-title min-w-0">{r.prompt}</h3>
                        <span className="ml-auto flex shrink-0 items-center gap-2.5">
                          <span className={`pill text-micro ${tone.pill}`}>
                            {RUN_LABEL[r.status]}
                          </span>
                          <time className="text-caption text-faint">{timeOfDay(r.created_at)}</time>
                        </span>
                      </div>

                      {/* Which planner ran, and what the safety screen decided.
                          Both are facts about the run the user is entitled to. */}
                      <p className="mt-2 flex flex-wrap items-center gap-2 pl-5.5 text-caption text-faint">
                        <span>{r.engine === "bedrock" ? "Reasoned by the model" : "Rule-based plan"}</span>
                        <span aria-hidden>·</span>
                        <span>{BAND_LABEL[r.safety_band]}</span>
                        {r.duration_ms !== null && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="tnum">{Math.round(r.duration_ms)} ms</span>
                          </>
                        )}
                      </p>

                      <ul className="mt-3 pl-5.5">
                        {r.actions.map((a, i) => {
                          const art = artFor(a);
                          return (
                            <li
                              key={`${a.tool}-${i}`}
                              className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-line py-3"
                            >
                              <span
                                className={`grid size-6.5 shrink-0 place-items-center rounded-full ${art.bg}`}
                                aria-hidden
                              >
                                <svg viewBox="0 0 24 24" className="size-3.5" fill="none">
                                  <path
                                    d={art.path}
                                    stroke={art.fg}
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                              <span className="min-w-0 flex-1 text-small leading-[1.45] text-ink-3">
                                {a.summary}
                              </span>
                              <span
                                className={`ml-auto shrink-0 text-caption ${
                                  a.result === "awaiting_approval"
                                    ? "text-pink-deep"
                                    : a.result === "blocked"
                                      ? "text-danger"
                                      : "text-green"
                                }`}
                              >
                                {a.result_label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {shown.length === 0 && (
            <p className="card p-8 text-center text-body text-muted">
              {days.length === 0 ? (
                <>
                  Nothing here yet.{" "}
                  <Link href="/agent" className="font-medium text-pink hover:underline">
                    Give Nnneva a goal
                  </Link>{" "}
                  and every step it takes will be recorded here.
                </>
              ) : (
                `No ${filter.toLowerCase()} in this period.`
              )}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
