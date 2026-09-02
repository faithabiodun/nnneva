"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Mark } from "@/components/Brand";
import { STEPS } from "@/lib/onboarding";

/**
 * Onboarding: one question at a time, with the reason for asking pinned beside
 * it. Answers are held in component state for now — they become the
 * PregnancyProfile write once the API exists.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<number, string[]>>({});

  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;
  const chosen = picked[i] ?? [];

  function choose(label: string) {
    setPicked((prev) => {
      const current = prev[i] ?? [];
      if (step.kind === "multi") {
        return {
          ...prev,
          [i]: current.includes(label)
            ? current.filter((l) => l !== label)
            : [...current, label],
        };
      }
      return { ...prev, [i]: [label] };
    });
  }

  function next() {
    if (isLast) router.push("/home");
    else setI((n) => n + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center gap-3 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Nnneva home">
          <Mark size={32} />
          <span className="font-display text-[18px] font-semibold text-ink">Nnneva</span>
        </Link>
        <span className="ml-auto text-caption text-muted-2">
          Step {i + 1} of {STEPS.length}
        </span>
      </header>

      {/* Progress. A plain bar, because a five-step form does not need more. */}
      <div className="h-[3px] bg-surface-3" role="presentation">
        <div
          className="h-full bg-pink transition-[width] duration-500 ease-out"
          style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 items-start justify-center px-5 py-10 sm:px-8 lg:items-center">
        <div className="grid w-full max-w-[1040px] gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start lg:gap-14">
          {/* ---- The question ------------------------------------------- */}
          <div key={i} className="animate-rise">
            <p className="mb-3.5 text-[11.5px] tracking-[0.13em] uppercase text-pink">
              {step.eyebrow}
            </p>
            <h1 className="font-display text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.02em]">
              {step.question}
            </h1>
            <p className="mt-3.5 mb-8 max-w-[460px] text-body text-muted">{step.help}</p>

            {step.kind === "date" ? (
              <DueDateCard />
            ) : (
              <ul className="flex max-w-[520px] flex-col gap-2.5">
                {step.options?.map((o) => {
                  const on = chosen.includes(o.label);
                  return (
                    <li key={o.label}>
                      <button
                        type="button"
                        onClick={() => choose(o.label)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3.5 rounded-[15px] px-5 py-4 text-left shadow-[0_1px_2px_rgba(11,44,34,0.05),0_8px_22px_rgba(11,44,34,0.05)] transition-colors ${
                          on ? "bg-pink-wash" : "bg-white hover:bg-surface"
                        }`}
                      >
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-[6px] transition-colors ${
                            on ? "bg-pink" : "bg-surface-3"
                          }`}
                          aria-hidden
                        >
                          <svg viewBox="0 0 24 24" className="size-3" fill="none">
                            <path
                              d="m5 12.5 4.5 4.5L19 7"
                              stroke={on ? "#fff" : "transparent"}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15.5px] leading-snug font-medium text-ink">
                            {o.label}
                          </span>
                          {o.sub && (
                            <span className="mt-0.5 block text-caption text-muted-2">{o.sub}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setI((n) => Math.max(0, n - 1))}
                disabled={i === 0}
                className="px-1 py-3 text-[14.5px] text-muted disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-pill bg-ink px-7 py-3.5 text-[15px] font-medium text-canvas transition-colors hover:bg-green-deep"
              >
                {isLast ? "Finish setup" : "Continue"}
              </button>
              {step.skip && (
                <button
                  type="button"
                  onClick={next}
                  className="ml-1 text-caption text-faint transition-colors hover:text-muted"
                >
                  {step.skip}
                </button>
              )}
            </div>
          </div>

          {/* ---- Why this is being asked --------------------------------- */}
          <aside className="relative mt-5 hidden pt-4 lg:block">
            <div
              className="min-h-[240px] rotate-[-1.8deg] rounded-[3px] px-8 pt-9.5 pb-11 shadow-[0_1px_1px_rgba(11,44,34,0.10),0_14px_30px_rgba(11,44,34,0.14)] transition-colors duration-300"
              style={{ background: step.noteBg }}
            >
              <p
                className="text-[17.5px] leading-[1.72] text-pretty"
                style={{ color: step.noteFg }}
              >
                {step.why}
              </p>
            </div>
            {/* The pin. Two circles: the head, and the highlight on it. */}
            <span
              className="absolute top-0 left-1/2 size-[22px] -translate-x-1/2 rounded-full bg-pink shadow-[inset_0_-2px_4px_rgba(0,0,0,0.22),inset_0_2px_3px_rgba(255,255,255,0.45),0_4px_8px_rgba(11,44,34,0.25)]"
              aria-hidden
            />
            <span
              className="absolute top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white/45"
              aria-hidden
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function DueDateCard() {
  return (
    <div className="max-w-[460px] rounded-[20px] bg-white px-7 py-6.5 shadow-[0_1px_3px_rgba(11,44,34,0.05),0_12px_32px_rgba(11,44,34,0.06)]">
      <div className="flex gap-3">
        {[
          { label: "Day", value: "14", grow: "flex-1" },
          { label: "Month", value: "November", grow: "flex-[1.6]" },
          { label: "Year", value: "2026", grow: "flex-[1.1]" },
        ].map((f) => (
          <label key={f.label} className={`${f.grow} min-w-0`}>
            <span className="mb-1.5 block text-[12px] text-muted-2">{f.label}</span>
            <input
              defaultValue={f.value}
              className="w-full rounded-[11px] bg-surface px-4 py-3.5 text-[16px] text-ink outline-none"
            />
          </label>
        ))}
      </div>

      <p className="mt-4.5 rounded-md bg-pink-wash px-4 py-3.5 text-small text-ink">
        That puts you at <strong className="font-semibold">32 weeks</strong>, third trimester.
      </p>
    </div>
  );
}
