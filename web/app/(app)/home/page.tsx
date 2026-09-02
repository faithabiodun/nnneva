import Link from "next/link";

import { AppShell } from "@/components/app/AppShell";

export const metadata = { title: "Home" };

const TODAY = [
  { title: "Confirm the blood test slot", meta: "Due today · Lagoon Clinic", done: false },
  { title: "Start fasting at 21:00", meta: "Reminder tonight", done: false },
  { title: "Take iron with breakfast", meta: "Done, 08:10", done: true },
];

const PLANS = [
  { title: "Prepare for Thursday's antenatal review", status: "6 of 9 done", pct: 66 },
  { title: "Third-trimester blood test", status: "Waiting on the clinic", pct: 40 },
];

const ACTIVITY = [
  { text: "Saved 6 questions for Thursday's visit", time: "08:12", tone: "done" as const },
  { text: "Scheduled 3 reminders", time: "08:12", tone: "done" as const },
  { text: "Asked to share the blood test reminder with Chidi", time: "08:13", tone: "wait" as const },
  { text: "Checked the message for red flags — none found", time: "08:11", tone: "done" as const },
];

export default function HomePage() {
  return (
    <AppShell
      title="Good morning, Faith"
      subtitle="Tuesday, 8 September"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* ---- The one thing that needs a decision ---------------------- */}
          <section className="rounded-lg bg-pink-wash p-6">
            <p className="eyebrow text-pink">Waiting for you</p>
            <p className="mt-3 text-lead text-ink">
              Share the blood test reminder with Chidi, your trusted contact?
            </p>
            <p className="mt-2 text-small text-muted">
              This would send health information outside your account, so Nnneva needs your
              permission.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn btn-pink">
                Allow once
              </button>
              <button type="button" className="btn btn-quiet">
                Not now
              </button>
            </div>
          </section>

          {/* ---- Today ---------------------------------------------------- */}
          <section className="card p-6">
            <h2 className="text-h3 font-sans font-medium">Today</h2>
            <ul className="mt-4 flex flex-col">
              {TODAY.map((t) => (
                <li
                  key={t.title}
                  className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0 last:pb-0 first:pt-0"
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-[6px] ${
                      t.done ? "bg-green" : "bg-surface-3"
                    }`}
                    aria-hidden
                  >
                    {t.done && (
                      <svg viewBox="0 0 24 24" className="size-3" fill="none">
                        <path
                          d="m5 12.5 4.5 4.5L19 7"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-body ${t.done ? "text-faint line-through" : "text-ink"}`}
                    >
                      {t.title}
                    </span>
                    <span className="mt-0.5 block text-caption text-muted-2">{t.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Plans ---------------------------------------------------- */}
          <section className="card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-h3 font-sans font-medium">Your active plans</h2>
              <Link href="/tasks" className="text-caption font-medium text-pink">
                Open tasks
              </Link>
            </div>
            <ul className="mt-4 flex flex-col gap-4">
              {PLANS.map((p) => (
                <li key={p.title}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-body text-ink">{p.title}</span>
                    <span className="text-caption text-muted-2">{p.status}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-surface-3">
                    <div className="h-full rounded-pill bg-green" style={{ width: `${p.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---- Right column ------------------------------------------------ */}
        <div className="flex flex-col gap-5">
          <section className="card p-6">
            <h2 className="text-h3 font-sans font-medium">Next appointment</h2>
            <div className="mt-4 flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-md bg-ink text-center leading-none text-canvas">
                <span className="block">
                  <span className="block text-[10px] tracking-[0.1em] uppercase text-green-soft">
                    Thu
                  </span>
                  <span className="tnum mt-1 block font-display text-[20px]">10</span>
                </span>
              </span>
              <span className="min-w-0">
                <span className="tnum block text-body text-ink">09:30</span>
                <span className="block text-caption text-muted">
                  Antenatal review, Lagoon Clinic
                </span>
              </span>
            </div>
            <Link href="/appointments" className="btn btn-quiet mt-5 w-full">
              Open preparation
            </Link>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-h3 font-sans font-medium">Nnneva activity</h2>
              <Link href="/activity" className="text-caption font-medium text-pink">
                All
              </Link>
            </div>
            <ul className="mt-4 flex flex-col">
              {ACTIVITY.map((a) => (
                <li key={a.text} className="flex gap-3 border-b border-line py-3 last:border-b-0 first:pt-0 last:pb-0">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      a.tone === "wait" ? "bg-pink" : "bg-green-soft"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-small text-ink">{a.text}</span>
                  <time className="shrink-0 text-caption text-faint">{a.time}</time>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* ---- Ask ------------------------------------------------------------ */}
      <Link
        href="/agent"
        className="card mt-5 flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface"
      >
        <span className="size-2 shrink-0 rounded-full bg-pink" aria-hidden />
        <span className="min-w-0 flex-1 text-body text-muted-2">
          Ask Nnneva anything, or describe what you need done
        </span>
        <span className="pill hidden bg-surface text-caption text-muted-2 sm:inline-flex">Enter</span>
      </Link>
    </AppShell>
  );
}
