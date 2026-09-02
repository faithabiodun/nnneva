"use client";

import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { TickBox } from "@/components/app/Bits";
import { NEXT_VISIT, PAST_VISITS, PREP_ITEMS, QUESTIONS } from "@/lib/app-data";

export default function AppointmentsPage() {
  const [done, setDone] = useState(
    () => new Set(PREP_ITEMS.filter((p) => p.done).map((p) => p.id)),
  );
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    setExtra((prev) => [...prev, q]);
    setDraft("");
  };

  const questions = [
    ...QUESTIONS,
    ...extra.map((text, i) => ({
      n: String(QUESTIONS.length + i + 1).padStart(2, "0"),
      text,
      source: "You, today",
    })),
  ];

  return (
    <AppShell
      title="Appointments"
      subtitle="Preparation for your next visit"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="grid max-w-[1180px] gap-4.5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4.5">
          {/* ---- The visit itself ------------------------------------------ */}
          <section className="card p-6.5">
            <div className="flex flex-wrap items-center gap-5.5">
              <p className="grid size-22 flex-none place-items-center rounded-xl bg-ink text-center text-canvas">
                <span>
                  <span className="block text-[11px] tracking-[0.1em] uppercase text-green-mid">
                    {NEXT_VISIT.month}
                  </span>
                  <span className="tnum block font-display text-[34px] leading-[1.05] font-semibold">
                    {NEXT_VISIT.day}
                  </span>
                  <span className="block text-[11px] text-green-mid">{NEXT_VISIT.weekday}</span>
                </span>
              </p>
              <div className="min-w-0">
                <h2 className="font-display text-[24px] font-semibold text-ink">
                  {NEXT_VISIT.title}
                </h2>
                <p className="mt-1.5 text-small text-muted">{NEXT_VISIT.when}</p>
                <p className="mt-0.5 text-small text-muted">{NEXT_VISIT.clinician}</p>
              </div>
              <button type="button" className="btn btn-quiet ml-auto self-start">
                Reschedule
              </button>
            </div>
          </section>

          {/* ---- Questions -------------------------------------------------- */}
          <section className="card p-6.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card-title">Questions for this visit</h2>
              <p className="text-caption text-faint">Prepared by Nnneva, edited by you</p>
            </div>
            <ol className="mt-3.5 flex flex-col gap-2.5">
              {questions.map((q) => (
                <li
                  key={q.n}
                  className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md bg-[#FAF7F5] px-4 py-3.5"
                >
                  <span className="tnum mt-0.5 font-mono text-caption text-faint">{q.n}</span>
                  <span className="min-w-0 flex-1 text-small leading-[1.5] text-ink-3">{q.text}</span>
                  <span className="ml-auto shrink-0 text-[11.5px] text-faint">{q.source}</span>
                </li>
              ))}
            </ol>
            <form onSubmit={add} className="mt-3.5 flex items-center gap-2.5 rounded-md bg-surface p-1 pl-4">
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
              <button type="submit" className="btn btn-ink shrink-0 !rounded-sm !px-4.5 !py-2.5">
                Add
              </button>
            </form>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4.5">
          {/* ---- Preparation ------------------------------------------------ */}
          <section className="card px-6 pt-5.5 pb-3">
            <h2 className="card-title">Preparation</h2>
            <ul className="mt-2.5">
              {PREP_ITEMS.map((p) => {
                const on = done.has(p.id);
                return (
                  <li key={p.id} className="border-t border-line">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <TickBox on={on} size={19} />
                      <span className={`text-small ${on ? "text-faint line-through" : "text-ink-2"}`}>
                        {p.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---- History ------------------------------------------------------ */}
          <section className="card p-6">
            <h2 className="mb-3 card-title">Past visits</h2>
            <ul className="flex flex-col">
              {PAST_VISITS.map((v) => (
                <li key={v.title} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-small text-ink-3">{v.title}</span>
                    <span className="mt-0.5 block text-caption text-faint">{v.date}</span>
                  </span>
                  <button
                    type="button"
                    className="ml-auto shrink-0 text-caption font-medium text-pink hover:underline"
                  >
                    Notes
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
