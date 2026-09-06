"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { completeOnboarding } from "@/app/actions/app";
import { Mark } from "@/components/Brand";
import { ClockPicker } from "@/components/onboarding/ClockPicker";
import { DueDateCalendar } from "@/components/onboarding/DueDateCalendar";
import {
  EMPTY,
  dueDateProblem,
  dueDateRange,
  RELATIONSHIPS,
  toPayload,
  type Answers,
} from "@/lib/onboarding-answers";
import { STEPS } from "@/lib/onboarding";

/**
 * Onboarding: one question at a time, with the reason for asking pinned beside
 * it. The last step writes the PregnancyProfile, the trusted contact and the
 * first memories, so the agent's very first run already has context.
 */
export default function OnboardingPage() {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  function toggleArea(label: string) {
    setAnswers((prev) => ({
      ...prev,
      helpAreas: prev.helpAreas.includes(label)
        ? prev.helpAreas.filter((a) => a !== label)
        : [...prev.helpAreas, label],
    }));
  }

  /**
   * Why this step cannot be left yet, or null.
   *
   * Skipping is exempt: a step that offers a way out means the answer really is
   * optional, and validating it anyway would make the skip a lie. The due date
   * is the exception — nothing else in the product works without it, which is
   * why step one offers no skip at all.
   */
  function problemWith(index: number): string | null {
    const step = STEPS[index];
    switch (step.kind) {
      case "date":
        return dueDateProblem(answers);
      case "place":
        return answers.careKind || answers.careName.trim()
          ? null
          : "Choose the kind of care, or type where you will be seen.";
      case "multi":
        return answers.helpAreas.length > 0
          ? null
          : "Pick at least one thing for Nnneva to handle.";
      case "contact":
        // The whole step is optional; only a half-filled answer is a problem.
        if (!answers.contactName.trim()) return null;
        return answers.contactRelationship
          ? null
          : "Choose who they are to you.";
      case "choice":
        return answers.contactWindow === "any" || answers.contactTime
          ? null
          : "Pick a time, or choose any time.";
      default:
        return null;
    }
  }

  function next(skipping = false) {
    setProblem(null);

    if (!skipping) {
      const bad = problemWith(i);
      if (bad) {
        setProblem(bad);
        return;
      }
    }
    if (!isLast) {
      setI((n) => n + 1);
      return;
    }

    startSaving(async () => {
      try {
        await completeOnboarding(toPayload(skipping ? answers : answers));
      } catch (error) {
        // A redirect throws by design; anything else is a real failure.
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
        setProblem("Could not save your setup. Please try again.");
      }
    });
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

            {step.kind === "date" && (
              <DueDateCalendar
                value={answers.dueDate}
                onChange={(d) => set("dueDate", d)}
                {...dueDateRange()}
              />
            )}

            {step.kind === "place" && (
              <div className="max-w-[520px]">
                <Choices
                  options={step.options ?? []}
                  selected={answers.careKind ? [answers.careKind] : []}
                  onPick={(label) => set("careKind", answers.careKind === label ? "" : label)}
                />
                <div className="mt-3.5 flex flex-col gap-3 sm:flex-row">
                  <Field
                    label="Name of the place"
                    value={answers.careName}
                    onChange={(v) => set("careName", v)}
                    placeholder="Lagoon Antenatal Clinic"
                  />
                  <Field
                    label="Your midwife or doctor"
                    value={answers.clinician}
                    onChange={(v) => set("clinician", v)}
                    placeholder="Optional"
                  />
                </div>
                <LocateMe onFound={(place) => set("careName", place)} />
              </div>
            )}

            {step.kind === "multi" && (
              <Choices
                options={step.options ?? []}
                selected={answers.helpAreas}
                onPick={toggleArea}
              />
            )}

            {step.kind === "contact" && (
              <div className="flex max-w-[560px] flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Field
                    label="Their name"
                    value={answers.contactName}
                    onChange={(v) => set("contactName", v)}
                    placeholder="Someone you trust"
                  />
                  {/* Chosen rather than typed: the stored value is then one of a
                      known set, which the agent can reason about instead of
                      guessing what "hubby" means. */}
                  <label className="min-w-0 flex-1">
                    <span className="mb-1.5 block text-[12px] text-muted-2">
                      Who they are to you
                    </span>
                    <select
                      value={answers.contactRelationship}
                      onChange={(e) => set("contactRelationship", e.target.value)}
                      className="w-full appearance-none rounded-[11px] bg-white px-4 py-3.5 text-[15px] text-ink shadow-[0_1px_2px_rgba(11,44,34,0.05)] outline-none focus:ring-2 focus:ring-green"
                    >
                      <option value="">Choose</option>
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Field
                    label="Their phone"
                    value={answers.contactPhone}
                    onChange={(v) => set("contactPhone", v)}
                    placeholder="+234 801 234 5678"
                  />
                  <Field
                    label="Their email"
                    value={answers.contactEmail}
                    onChange={(v) => set("contactEmail", v)}
                    placeholder="Optional"
                  />
                </div>
                <p className="text-caption text-faint">
                  Nnneva never contacts them on its own. Both are only used when you approve
                  something specific to send.
                </p>
              </div>
            )}

            {step.kind === "choice" && (
              <ContactWindow answers={answers} set={set} />
            )}

            {problem && (
              <p role="alert" className="mt-5 max-w-[520px] text-small text-danger">
                {problem}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setI((n) => Math.max(0, n - 1))}
                disabled={i === 0 || saving}
                className="px-1 py-3 text-[14.5px] text-muted disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => next()}
                disabled={saving}
                className="rounded-pill bg-ink px-7 py-3.5 text-[15px] font-medium text-canvas transition-colors hover:bg-green-deep disabled:opacity-60"
              >
                {saving ? "Setting up…" : isLast ? "Finish setup" : "Continue"}
              </button>
              {step.skip && i !== 0 && (
                <button
                  type="button"
                  onClick={() => next(true)}
                  disabled={saving}
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
              <p className="text-[17.5px] leading-[1.72] text-pretty" style={{ color: step.noteFg }}>
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

function Choices({
  options,
  selected,
  onPick,
}: {
  options: { label: string; sub?: string }[];
  selected: string[];
  onPick: (label: string) => void;
}) {
  return (
    <ul className="flex max-w-[520px] flex-col gap-2.5">
      {options.map((o) => {
        const on = selected.includes(o.label);
        return (
          <li key={o.label}>
            <button
              type="button"
              onClick={() => onPick(o.label)}
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
                {o.sub && <span className="mt-0.5 block text-caption text-muted-2">{o.sub}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1.5 block text-[12px] text-muted-2">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[11px] bg-white px-4 py-3.5 text-[15px] text-ink shadow-[0_1px_2px_rgba(11,44,34,0.05)] outline-none placeholder:text-faint"
      />
    </label>
  );
}

/**
 * Fills in the care location from where the person actually is.
 *
 * Browser geolocation plus OpenStreetMap's reverse geocoder, which needs no API
 * key and no billing account — a Google Places lookup would give richer results
 * (the clinic's name rather than the street it is on) but cannot ship without
 * a key, and this should work for everyone on day one.
 *
 * Nothing is sent anywhere until the button is pressed, and the coordinates are
 * used for this one lookup and never stored.
 */
function LocateMe({ onFound }: { onFound: (place: string) => void }) {
  const [state, setState] = useState<"idle" | "locating" | "failed" | "denied">("idle");

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setState("failed");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url =
            "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
            `&lat=${coords.latitude}&lon=${coords.longitude}&zoom=16`;
          const r = await fetch(url, { headers: { Accept: "application/json" } });
          if (!r.ok) throw new Error(String(r.status));
          const data: { name?: string; display_name?: string } = await r.json();
          // The first two parts of the display name are the useful ones: the
          // place and its street. The rest is city, state, country, postcode.
          const place =
            data.name?.trim() ||
            data.display_name?.split(",").slice(0, 2).join(",").trim() ||
            "";
          if (!place) throw new Error("no place");
          onFound(place);
          setState("idle");
        } catch {
          setState("failed");
        }
      },
      () => setState("denied"),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={locate}
        disabled={state === "locating"}
        className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2.5 text-caption text-muted shadow-[0_1px_2px_rgba(11,44,34,0.05)] transition-colors hover:text-ink disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        {state === "locating" ? "Finding you…" : "Use my current location"}
      </button>
      {state === "denied" && (
        <p className="mt-2 text-caption text-faint">
          Location is blocked in your browser. Type the name instead.
        </p>
      )}
      {state === "failed" && (
        <p className="mt-2 text-caption text-faint">
          Could not work out where you are. Type the name instead.
        </p>
      )}
    </div>
  );
}

/**
 * When Nnneva may get in touch: a clock, or no window at all.
 *
 * A time input rather than three fixed choices, because "evenings" means
 * something different to a nurse on nights than to everyone else. `any` is kept
 * as its own state rather than a sentinel time, so "no preference" is a real
 * answer and not 00:00.
 */
function ContactWindow({
  answers,
  set,
}: {
  answers: Answers;
  set: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
}) {
  const anyTime = answers.contactWindow === "any";
  return (
    <div className="max-w-[460px] rounded-[20px] bg-white px-7 py-6.5 shadow-[0_1px_3px_rgba(11,44,34,0.05),0_12px_32px_rgba(11,44,34,0.06)]">
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={!anyTime}
          onClick={() => set("contactWindow", "at")}
          className={`flex-1 rounded-md px-4 py-2.5 text-small transition-colors ${
            !anyTime ? "bg-green text-white" : "bg-surface text-muted hover:text-ink"
          }`}
        >
          From a time
        </button>
        <button
          type="button"
          aria-pressed={anyTime}
          onClick={() => set("contactWindow", "any")}
          className={`flex-1 rounded-md px-4 py-2.5 text-small transition-colors ${
            anyTime ? "bg-green text-white" : "bg-surface text-muted hover:text-ink"
          }`}
        >
          Any time is fine
        </button>
      </div>

      {!anyTime && (
        <div className="mt-4">
          <ClockPicker
            value={answers.contactTime}
            onChange={(t) => set("contactTime", t)}
          />
        </div>
      )}

      <p className="mt-4.5 rounded-md bg-green-tint px-4 py-3.5 text-small text-ink" aria-live="polite">
        {anyTime
          ? "Nnneva will reach you whenever something needs you."
          : `Anything that is not urgent waits until ${answers.contactTime}.`}
      </p>
    </div>
  );
}
