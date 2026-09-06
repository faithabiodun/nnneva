"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { addQuestion, togglePreparation } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { TickBox } from "@/components/app/Bits";
import { dayMonth, dayOfMonth, monthShort, timeOfDay, weekdayLong } from "@/lib/format";
import type { Appointment } from "@/lib/types";

export function AppointmentsView({
  visit,
  past,
}: {
  visit: Appointment | null;
  past: Appointment[];
}) {
  const [draft, setDraft] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [busy, startTransition] = useTransition();

  if (!visit) {
    return (
      <AppShell title="Appointments" subtitle="Preparation for your next visit">
        <p className="card max-w-[560px] p-8 text-body text-muted">
          No appointment is scheduled.{" "}
          <Link href="/agent" className="font-medium text-pink-ink hover:underline">
            Tell Nnneva when your next visit is
          </Link>{" "}
          and it will prepare for it.
        </p>
      </AppShell>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setAdded((prev) => [...prev, text]);
    setDraft("");
    startTransition(async () => {
      await addQuestion(visit.id, text);
    });
  };

  const flip = (itemId: string, done: boolean) => {
    setTicked((prev) => ({ ...prev, [itemId]: !done }));
    startTransition(async () => {
      await togglePreparation(visit.id, itemId);
    });
  };

  const questions = [
    ...visit.questions,
    ...added.map((text, i) => ({
      id: `pending-${i}`,
      text,
      source: "You",
      asked: false,
    })),
  ];

  return (
    <AppShell title="Appointments" subtitle="Preparation for your next visit">
      <div className="grid max-w-[1180px] gap-4.5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4.5">
          {/* ---- The visit itself ------------------------------------------ */}
          <section className="card p-6.5">
            <div className="flex flex-wrap items-center gap-5.5">
              <p className="grid size-22 flex-none place-items-center rounded-xl bg-ink text-center text-canvas">
                <span>
                  <span className="block text-[11px] tracking-[0.1em] uppercase text-green-ink-mid">
                    {monthShort(visit.starts_at)}
                  </span>
                  <span className="tnum block font-display text-[34px] leading-[1.05] font-semibold">
                    {dayOfMonth(visit.starts_at)}
                  </span>
                  <span className="block text-[11px] text-green-ink-mid">
                    {weekdayLong(visit.starts_at)}
                  </span>
                </span>
              </p>
              <div className="min-w-0">
                <h2 className="font-display text-[24px] font-semibold text-ink">{visit.title}</h2>
                <p className="mt-1.5 text-small text-muted">
                  {timeOfDay(visit.starts_at)}
                  {visit.location ? ` · ${visit.location}` : ""}
                </p>
                {visit.clinician && (
                  <p className="mt-0.5 text-small text-muted">{visit.clinician}</p>
                )}
              </div>
            </div>
          </section>

          {/* ---- Questions -------------------------------------------------- */}
          <section className="card p-6.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card-title">Questions for this visit</h2>
              <p className="text-caption text-faint">Prepared by Nnneva, edited by you</p>
            </div>
            {questions.length === 0 ? (
              <p className="mt-3.5 text-body text-muted">
                Nothing saved yet. Add one below, or ask Nnneva to prepare a set.
              </p>
            ) : (
              <ol className="mt-3.5 flex flex-col gap-2.5">
                {questions.map((q, i) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md bg-[#FAF7F5] px-4 py-3.5"
                  >
                    <span className="tnum mt-0.5 font-mono text-caption text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 text-small leading-[1.5] text-ink-3">
                      {q.text}
                    </span>
                    <span className="ml-auto shrink-0 text-[11.5px] text-faint">{q.source}</span>
                  </li>
                ))}
              </ol>
            )}
            <form
              onSubmit={submit}
              className="mt-3.5 flex items-center gap-2.5 rounded-md bg-surface p-1 pl-4"
            >
              <label htmlFor="q" className="sr-only">
                Add a question for the midwife
              </label>
              <input
                id="q"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a question for the midwife"
                className="min-w-0 flex-1 bg-transparent py-3 text-small text-ink-2 outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="btn btn-ink shrink-0 !rounded-sm !px-4.5 !py-2.5 disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4.5">
          {/* ---- Preparation ------------------------------------------------ */}
          {visit.preparation.length > 0 && (
            <section className="card px-6 pt-5.5 pb-3">
              <h2 className="card-title">Preparation</h2>
              <ul className="mt-2.5">
                {visit.preparation.map((p) => {
                  const on = ticked[p.id] ?? p.done;
                  return (
                    <li key={p.id} className="border-t border-line">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => flip(p.id, on)}
                        className="flex w-full items-center gap-3 py-3 text-left"
                      >
                        <TickBox on={on} size={19} />
                        <span
                          className={`text-small ${on ? "text-faint line-through" : "text-ink-2"}`}
                        >
                          {p.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ---- History ------------------------------------------------------ */}
          {past.length > 0 && (
            <section className="card p-6">
              <h2 className="card-title mb-3">Past visits</h2>
              <ul className="flex flex-col">
                {past.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-small text-ink-3">{v.title}</span>
                      <span className="mt-0.5 block text-caption text-faint">
                        {dayMonth(v.starts_at)}
                        {v.clinician ? ` · ${v.clinician}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
