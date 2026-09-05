"use client";

import { useState } from "react";

import { trimesterFor, weeksFrom } from "@/lib/onboarding-answers";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** A pregnancy is dated 280 days from the first day of the last period. */
const GESTATION_DAYS = 280;

function iso(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

/** The Monday-first grid for a month, padded with the days either side. */
function gridFor(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; this shifts it so Monday is 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * A calendar that knows what the date means.
 *
 * A plain date input asks for a number and tells you nothing back. This shows,
 * for whichever day is under the cursor, the week that date would put someone
 * in — so a year entered wrong reads as "3 weeks" immediately, rather than
 * looking fine until every later deadline is quietly off.
 *
 * It also works the other way round. Most people know when their last period
 * started far better than they know a due date, so that is offered as a second
 * way in and converted with the same 280-day rule a midwife uses.
 */
export function DueDateCalendar({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  min: string;
  max: string;
}) {
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const initial = selected ?? new Date();
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [hover, setHover] = useState<string | null>(null);
  const [lastPeriod, setLastPeriod] = useState("");
  const [mode, setMode] = useState<"due" | "period">("due");

  const today = iso(new Date());
  const preview = hover ?? value;
  const previewWeek = preview ? weeksFrom(preview) : null;

  const step = (by: number) => {
    const d = new Date(cursor.year, cursor.month + by, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const fromLastPeriod = (start: string) => {
    setLastPeriod(start);
    if (!start) return;
    const due = new Date(`${start}T00:00:00`);
    due.setDate(due.getDate() + GESTATION_DAYS);
    const dueIso = iso(due);
    if (dueIso >= min && dueIso <= max) {
      onChange(dueIso);
      setCursor({ year: due.getFullYear(), month: due.getMonth() });
    }
  };

  return (
    <div className="max-w-[460px] rounded-[20px] bg-white px-6 py-6 shadow-[0_1px_3px_rgba(11,44,34,0.05),0_12px_32px_rgba(11,44,34,0.06)]">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          aria-pressed={mode === "due"}
          onClick={() => setMode("due")}
          className={`flex-1 rounded-md px-3 py-2 text-caption transition-colors ${
            mode === "due" ? "bg-green text-white" : "bg-surface text-muted hover:text-ink"
          }`}
        >
          I know my due date
        </button>
        <button
          type="button"
          aria-pressed={mode === "period"}
          onClick={() => setMode("period")}
          className={`flex-1 rounded-md px-3 py-2 text-caption transition-colors ${
            mode === "period" ? "bg-green text-white" : "bg-surface text-muted hover:text-ink"
          }`}
        >
          Work it out for me
        </button>
      </div>

      {mode === "period" ? (
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-muted-2">
            First day of your last period
          </span>
          <input
            type="date"
            value={lastPeriod}
            max={today}
            onChange={(e) => fromLastPeriod(e.target.value)}
            className="w-full rounded-[11px] bg-surface px-4 py-3.5 text-[16px] text-ink outline-none focus:ring-2 focus:ring-green"
          />
          <span className="mt-2 block text-caption text-faint">
            Nnneva counts 280 days from there, the same rule a midwife uses.
          </span>
        </label>
      ) : (
        <>
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              &lsaquo;
            </button>
            <p className="text-small font-medium text-ink">
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </p>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              &rsaquo;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5" role="grid">
            {WEEKDAYS.map((d, i) => (
              <span
                key={i}
                className="py-1.5 text-center text-[11px] text-faint"
                role="columnheader"
              >
                {d}
              </span>
            ))}
            {gridFor(cursor.year, cursor.month).map((d) => {
              const day = iso(d);
              const outside = d.getMonth() !== cursor.month;
              const disabled = day < min || day > max;
              const isSelected = day === value;
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  disabled={disabled}
                  aria-selected={isSelected}
                  onMouseEnter={() => !disabled && setHover(day)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => !disabled && setHover(day)}
                  onClick={() => onChange(day)}
                  className={`tnum rounded-md py-2 text-caption transition-colors ${
                    isSelected
                      ? "bg-green font-medium text-white"
                      : disabled
                        ? "cursor-not-allowed text-surface-3"
                        : outside
                          ? "text-faint hover:bg-surface"
                          : "text-ink-2 hover:bg-surface"
                  } ${day === today && !isSelected ? "ring-1 ring-pink ring-inset" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </>
      )}

      <p
        className="mt-4 rounded-md bg-pink-wash px-4 py-3.5 text-small text-ink"
        aria-live="polite"
      >
        {previewWeek === null ? (
          "Pick your due date and Nnneva will work out where you are."
        ) : (
          <>
            {hover && hover !== value ? "That would put you at " : "That puts you at "}
            <strong className="font-semibold">{previewWeek} weeks</strong>,{" "}
            {trimesterFor(previewWeek)}.
          </>
        )}
      </p>
    </div>
  );
}
