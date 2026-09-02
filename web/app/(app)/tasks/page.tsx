"use client";

import { useMemo, useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { FilterChips, TickBox } from "@/components/app/Bits";
import {
  GOAL_BAR,
  GOALS,
  STATUS_TONE,
  TASK_FILTERS,
  type Task,
  type TaskFilter,
} from "@/lib/app-data";

/** The tasks that start ticked, so the demo opens part-way through a plan. */
const INITIAL = new Set(GOALS.flatMap((g) => g.tasks.filter((t) => t.done).map((t) => t.id)));

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [done, setDone] = useState<Set<string>>(INITIAL);

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Empty goals drop out entirely — a heading with nothing under it reads as a bug.
  const groups = useMemo(() => {
    const matches = (t: Task) => {
      const on = done.has(t.id);
      if (filter === "All") return true;
      if (filter === "Done") return on;
      if (filter === "In progress")
        return !on && (t.status === "In progress" || t.status === "Scheduled");
      return !on && t.status === "Awaiting approval";
    };
    return GOALS.map((g) => ({ ...g, tasks: g.tasks.filter(matches) })).filter(
      (g) => g.tasks.length > 0,
    );
  }, [filter, done]);

  return (
    <AppShell
      title="Tasks and plans"
      subtitle="Grouped by the goal that created them"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="max-w-[1080px]">
        <FilterChips options={TASK_FILTERS} value={filter} onChange={setFilter} label="Filter tasks" />

        <div className="mt-5 flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.title} className="card px-6 pt-5.5 pb-2.5">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                <div className="min-w-0">
                  <h2 className="card-title">{g.title}</h2>
                  <p className="mt-1 text-caption text-faint">{g.meta}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="h-1.5 w-30 overflow-hidden rounded-pill bg-surface-3">
                    <div
                      className={`h-full rounded-pill ${GOAL_BAR[g.bar]}`}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <span className="tnum w-9 text-right text-caption text-muted">{g.pct}%</span>
                </div>
              </div>

              <ul className="mt-3">
                {g.tasks.map((t) => {
                  const on = done.has(t.id);
                  const status = on ? "Complete" : t.status;
                  return (
                    <li key={t.id} className="border-t border-line">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(t.id)}
                        className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-1.5 py-3.5 text-left"
                      >
                        <TickBox on={on} />
                        {/* The basis keeps the title readable on a narrow screen:
                            below it the due date and pill wrap to their own line
                            instead of squeezing the title into four words a line. */}
                        <span
                          className={`min-w-0 flex-1 basis-48 text-body ${
                            on ? "text-faint line-through" : "text-ink-2"
                          }`}
                        >
                          {t.title}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-2.5">
                          <span className="text-caption text-faint">{on ? "Done" : t.due}</span>
                          <span className={`pill text-micro ${STATUS_TONE[status]}`}>{status}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {groups.length === 0 && (
            <p className="card p-8 text-center text-body text-muted">
              Nothing is {filter.toLowerCase()} right now.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
