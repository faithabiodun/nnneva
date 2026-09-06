"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { setTaskStatus } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { FilterChips, TickBox } from "@/components/app/Bits";
import { dueLabel } from "@/lib/format";
import type { Goal, Task, TaskStatus } from "@/lib/types";

const FILTERS = ["All", "In progress", "Awaiting approval", "Done"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_TONE: Record<TaskStatus, string> = {
  Complete: "bg-green-wash text-green-ink",
  "In progress": "bg-[#EAF0FA] text-[#3A5A8C]",
  Scheduled: "bg-surface-2 text-muted-2",
  "To do": "bg-surface-2 text-muted-2",
  "Awaiting approval": "bg-pink-wash text-pink-ink-deep",
  Cancelled: "bg-surface-2 text-faint",
};

/** Urgency, not progress: pink is waiting on her, amber is a soft target. */
function barFor(goal: Goal): string {
  if (goal.tasks.some((t) => t.status === "Awaiting approval")) return "bg-pink";
  if (goal.created_by === "user") return "bg-[#B26D14]";
  return "bg-green";
}

export function TasksView({ goals }: { goals: Goal[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({});
  const [, startTransition] = useTransition();

  const statusOf = (t: Task): TaskStatus => optimistic[t.id] ?? t.status;

  const toggle = (task: Task) => {
    const next: TaskStatus = statusOf(task) === "Complete" ? "To do" : "Complete";
    setOptimistic((prev) => ({ ...prev, [task.id]: next }));
    startTransition(async () => {
      await setTaskStatus(task.id, next);
    });
  };

  // Empty goals drop out entirely — a heading with nothing under it reads as a bug.
  const groups = useMemo(() => {
    const matches = (t: Task) => {
      const status = optimistic[t.id] ?? t.status;
      if (filter === "All") return status !== "Cancelled";
      if (filter === "Done") return status === "Complete";
      if (filter === "In progress") return status === "In progress" || status === "Scheduled";
      return status === "Awaiting approval";
    };
    return goals
      .map((g) => ({ ...g, tasks: g.tasks.filter(matches) }))
      .filter((g) => g.tasks.length > 0);
  }, [filter, goals, optimistic]);

  return (
    <AppShell title="Tasks and plans" subtitle="Grouped by the goal that created them">
      <div className="max-w-[1080px]">
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter tasks" />

        <div className="mt-5 flex flex-col gap-4">
          {groups.map((g) => {
            const done = g.tasks.filter((t) => statusOf(t) === "Complete").length;
            return (
              <section key={g.id} className="card px-6 pt-5.5 pb-2.5">
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                  <div className="min-w-0">
                    <h2 className="card-title">{g.title}</h2>
                    <p className="mt-1 text-caption text-faint">
                      {g.created_by === "agent" ? "Created by Nnneva" : "Created by you"} ·{" "}
                      {done} of {g.tasks.length} done
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="h-1.5 w-30 overflow-hidden rounded-pill bg-surface-3">
                      <div
                        className={`h-full rounded-pill transition-[width] duration-500 ${barFor(g)}`}
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                    <span className="tnum w-9 text-right text-caption text-muted">
                      {g.progress}%
                    </span>
                  </div>
                </div>

                <ul className="mt-3">
                  {g.tasks.map((t) => {
                    const status = statusOf(t);
                    const on = status === "Complete";
                    return (
                      <li key={t.id} className="border-t border-line">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggle(t)}
                          className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-1.5 py-3.5 text-left"
                        >
                          <TickBox on={on} />
                          {/* The basis keeps the title readable on a narrow screen:
                              below it the due date and pill wrap to their own line. */}
                          <span
                            className={`min-w-0 flex-1 basis-48 text-body ${
                              on ? "text-faint line-through" : "text-ink-2"
                            }`}
                          >
                            {t.title}
                          </span>
                          <span className="ml-auto flex shrink-0 items-center gap-2.5">
                            <span className="text-caption text-faint">
                              {on ? "Done" : dueLabel(t.due_date)}
                            </span>
                            <span className={`pill text-micro ${STATUS_TONE[status]}`}>
                              {status}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {groups.length === 0 && (
            <p className="card p-8 text-center text-body text-muted">
              {goals.length === 0 ? (
                <>
                  No plans yet.{" "}
                  <Link href="/agent" className="font-medium text-pink-ink hover:underline">
                    Tell Nnneva what you need
                  </Link>{" "}
                  and it will build one.
                </>
              ) : (
                `Nothing is ${filter.toLowerCase()} right now.`
              )}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
