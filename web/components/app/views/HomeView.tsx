"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { answerApproval, setTaskStatus } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { TickBox } from "@/components/app/Bits";
import { HomeAgent } from "@/components/app/HomeAgent";
import { appointmentWhen, dayOfMonth, dueLabel, timeOfDay, weekdayShort } from "@/lib/format";
import type { Home } from "@/lib/types";

const RESULT_TONE: Record<string, string> = {
  ok: "bg-green-soft",
  blocked: "bg-danger",
  awaiting_approval: "bg-pink",
  failed: "bg-faint",
};

export function HomeView({
  home,
  today,
  greeting,
  onboarded,
}: {
  home: Home;
  today: string;
  greeting: string;
  onboarded: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Ticked immediately, then confirmed by the server. A checkbox that waits for
  // a round trip feels broken even when it is working.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [answered, setAnswered] = useState<Record<string, boolean>>({});

  const toggle = (id: string, done: boolean) => {
    setOptimistic((prev) => ({ ...prev, [id]: !done }));
    startTransition(async () => {
      await setTaskStatus(id, !done ? "Complete" : "To do");
    });
  };

  const decide = (id: string, approve: boolean) => {
    setAnswered((prev) => ({ ...prev, [id]: true }));
    startTransition(async () => {
      await answerApproval(id, approve);
    });
  };

  const approval = home.pending_approvals.find((a) => !answered[a.id]);
  const visit = home.next_appointment;

  return (
    <AppShell
      title={`${greeting}, ${home.greeting_name}`}
      subtitle={today}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* ---- The one thing that needs a decision ---------------------- */}
          {approval && (
            <section className="animate-rise rounded-lg bg-pink-wash p-6">
              <p className="eyebrow text-pink-deep">Waiting for you</p>
              <p className="mt-3 text-lead text-ink">{approval.question}</p>
              {approval.why && <p className="mt-2 text-small text-muted">{approval.why}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(approval.id, true)}
                  className="btn btn-pink disabled:opacity-60"
                >
                  Allow once
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(approval.id, false)}
                  className="btn btn-quiet disabled:opacity-60"
                >
                  Not now
                </button>
              </div>
            </section>
          )}

          {/* ---- Today ---------------------------------------------------- */}
          <section className="card p-6">
            <h2 className="card-title">Today</h2>
            {home.today.length === 0 ? (
              <p className="mt-4 text-body text-muted">
                Nothing is due today.{" "}
                <Link href="/agent" className="font-medium text-pink hover:underline">
                  Give Nnneva something to handle
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 flex flex-col">
                {home.today.map((t) => {
                  const done = optimistic[t.id] ?? t.status === "Complete";
                  return (
                    <li key={t.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        onClick={() => toggle(t.id, done)}
                        className="flex w-full items-center gap-3.5 py-3.5 text-left first:pt-0"
                      >
                        <TickBox on={done} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-body ${done ? "text-faint line-through" : "text-ink"}`}
                          >
                            {t.title}
                          </span>
                          <span className="mt-0.5 block text-caption text-muted-2">
                            {dueLabel(t.due_date)} · {t.status}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---- Plans ---------------------------------------------------- */}
          {home.goals.length > 0 && (
            <section className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="card-title">Your active plans</h2>
                <Link href="/tasks" className="text-caption font-medium text-pink">
                  Open tasks
                </Link>
              </div>
              <ul className="mt-4 flex flex-col gap-4">
                {home.goals.map((g) => (
                  <li key={g.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-body text-ink">{g.title}</span>
                      <span className="tnum text-caption text-muted-2">
                        {g.tasks.filter((t) => t.status === "Complete").length} of {g.tasks.length}{" "}
                        done
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-surface-3">
                      <div
                        className="h-full rounded-pill bg-green transition-[width] duration-500"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---- Right column ------------------------------------------------ */}
        <div className="flex flex-col gap-5">
          {visit && (
            <section className="card p-6">
              <h2 className="card-title">Next appointment</h2>
              <div className="mt-4 flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-md bg-ink text-center leading-none text-canvas">
                  <span className="block">
                    <span className="block text-[10px] tracking-[0.1em] uppercase text-green-soft">
                      {weekdayShort(visit.starts_at)}
                    </span>
                    <span className="tnum mt-1 block font-display text-[20px]">
                      {dayOfMonth(visit.starts_at)}
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="tnum block text-body text-ink">
                    {timeOfDay(visit.starts_at)}
                  </span>
                  <span className="block text-caption text-muted">
                    {visit.title}
                    {visit.location ? `, ${visit.location.split(",")[0]}` : ""}
                  </span>
                </span>
              </div>
              <Link href="/appointments" className="btn btn-quiet mt-5 w-full">
                Open preparation
              </Link>
              <p className="sr-only">{appointmentWhen(visit.starts_at)}</p>
            </section>
          )}

          <section className="card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="card-title">Nnneva activity</h2>
              <Link href="/activity" className="text-caption font-medium text-pink">
                All
              </Link>
            </div>
            {home.recent_actions.length === 0 ? (
              <p className="mt-4 text-body text-muted">Nothing yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col">
                {home.recent_actions.map((a, i) => (
                  <li
                    key={`${a.tool}-${i}`}
                    className="flex gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        RESULT_TONE[a.result] ?? "bg-green-soft"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-small text-ink">{a.summary}</span>
                    <span className="shrink-0 text-caption text-faint">{a.result_label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ---- The agent ------------------------------------------------------ */}
      <HomeAgent onboarded={onboarded} />
    </AppShell>
  );
}
