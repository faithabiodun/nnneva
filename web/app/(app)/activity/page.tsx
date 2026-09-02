"use client";

import { useMemo, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { FilterChips } from "@/components/app/Bits";
import {
  ACTIVITY_DAYS,
  ACTIVITY_FILTERS,
  type ActionKind,
  type ActivityFilter,
} from "@/lib/app-data";

const KIND_FOR: Record<Exclude<ActivityFilter, "All">, ActionKind> = {
  Actions: "action",
  Approvals: "approval",
  Safety: "safety",
};

/** An approval is still open, so it keeps the clock face and the pink result. */
const ART: Record<ActionKind, { bg: string; fg: string; path: string }> = {
  action: { bg: "bg-[#E9F2EC]", fg: "#1F6B54", path: "m5 12.5 4.5 4.5L19 7" },
  safety: {
    bg: "bg-[#E9F2EC]",
    fg: "#1F6B54",
    path: "M12 3.5 5 6.5v5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9v-5zM9.2 12l2 2 3.6-3.8",
  },
  approval: {
    bg: "bg-pink-wash",
    fg: "#D62B60",
    path: "M12 12V7.5M12 12l3 2M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z",
  },
};

const RUN_TONE = {
  green: { dot: "bg-green", pill: "bg-green-wash text-green" },
  pink: { dot: "bg-pink", pill: "bg-pink-wash text-pink-deep" },
  danger: { dot: "bg-danger", pill: "bg-danger-wash text-danger" },
};

export default function ActivityPage() {
  const [filter, setFilter] = useState<ActivityFilter>("All");

  // Filtering narrows the actions inside each run, then drops runs and days that
  // end up empty — the log should never show a heading over nothing.
  const days = useMemo(() => {
    if (filter === "All") return ACTIVITY_DAYS;
    const kind = KIND_FOR[filter];
    return ACTIVITY_DAYS.map((d) => ({
      ...d,
      runs: d.runs
        .map((r) => ({ ...r, actions: r.actions.filter((a) => a.kind === kind) }))
        .filter((r) => r.actions.length > 0),
    })).filter((d) => d.runs.length > 0);
  }, [filter]);

  return (
    <AppShell
      title="Agent activity"
      subtitle="Everything Nnneva did, and why"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="max-w-[900px]">
        <FilterChips
          options={ACTIVITY_FILTERS}
          value={filter}
          onChange={setFilter}
          label="Filter activity"
        />

        <div className="mt-5 flex flex-col gap-5.5">
          {days.map((day) => (
            <section key={day.label}>
              <h2 className="eyebrow mb-3 text-faint">{day.label}</h2>
              <div className="flex flex-col gap-3">
                {day.runs.map((r) => {
                  const tone = RUN_TONE[r.tone];
                  return (
                    <article key={r.goal} className="card p-5.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className={`size-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
                        <h3 className="card-title min-w-0">{r.goal}</h3>
                        <span className="ml-auto flex shrink-0 items-center gap-2.5">
                          <span className={`pill text-micro ${tone.pill}`}>{r.status}</span>
                          <time className="text-caption text-faint">{r.time}</time>
                        </span>
                      </div>

                      <ul className="mt-3 pl-5.5">
                        {r.actions.map((a) => {
                          const art = ART[a.kind];
                          return (
                            <li
                              key={a.text}
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
                                {a.text}
                              </span>
                              <span
                                className={`ml-auto shrink-0 text-caption ${
                                  a.kind === "approval" ? "text-pink" : "text-green"
                                }`}
                              >
                                {a.result}
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

          {days.length === 0 && (
            <p className="card p-8 text-center text-body text-muted">
              No {filter.toLowerCase()} in this period.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
