"use client";

import { useState } from "react";

/** Where a number sits on the dial, as a fraction of the box. */
function pointAt(index: number, count: number, radius: number) {
  // -90° so index 0 is at the top rather than at three o'clock.
  const angle = ((index / count) * 2 * Math.PI) - Math.PI / 2;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

const HOURS = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/**
 * A round clock face for choosing a time.
 *
 * Two faces rather than one: hours first, then minutes, which is how every
 * phone clock behaves and avoids trying to fit 60 targets on one dial. Tapping
 * a number is the whole interaction — no dragging, so it works the same with a
 * mouse, a thumb, or a keyboard.
 *
 * The <input type="time"> underneath stays as the accessible control and the
 * single source of truth; the dial is a nicer way to reach the same value.
 */
export function ClockPicker({
  value,
  onChange,
}: {
  /** HH:MM, 24-hour. */
  value: string;
  onChange: (next: string) => void;
}) {
  const [face, setFace] = useState<"hour" | "minute">("hour");

  const [h24, m] = value.split(":").map(Number);
  const hour24 = Number.isFinite(h24) ? h24 : 18;
  const minute = Number.isFinite(m) ? m : 0;
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const write = (h12: number, min: number, pm: boolean) => {
    const h = (h12 % 12) + (pm ? 12 : 0);
    onChange(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };

  const numbers = face === "hour" ? HOURS : MINUTES;
  const activeIndex =
    face === "hour" ? HOURS.indexOf(hour12) : MINUTES.indexOf(Math.round(minute / 5) * 5 % 60);
  const hand = pointAt(Math.max(activeIndex, 0), 12, 34);

  return (
    <div>
      {/* The time itself, and which face is being edited. */}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => setFace("hour")}
          aria-pressed={face === "hour"}
          className={`tnum rounded-md px-2.5 py-1 font-display text-[30px] leading-none transition-colors ${
            face === "hour" ? "text-ink" : "text-faint hover:text-muted"
          }`}
        >
          {String(hour12).padStart(2, "0")}
        </button>
        <span className="font-display text-[30px] leading-none text-faint">:</span>
        <button
          type="button"
          onClick={() => setFace("minute")}
          aria-pressed={face === "minute"}
          className={`tnum rounded-md px-2.5 py-1 font-display text-[30px] leading-none transition-colors ${
            face === "minute" ? "text-ink" : "text-faint hover:text-muted"
          }`}
        >
          {String(minute).padStart(2, "0")}
        </button>
        <div className="ml-2 flex flex-col gap-1">
          {(["AM", "PM"] as const).map((label) => {
            const on = (label === "PM") === isPm;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => write(hour12, minute, label === "PM")}
                className={`rounded-md px-2 py-0.5 text-[11px] transition-colors ${
                  on ? "bg-green text-white" : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto w-[228px]">
        <svg viewBox="0 0 100 100" className="w-full" role="group" aria-label="Clock face">
          <circle cx="50" cy="50" r="48" className="fill-surface" />
          {/* The hand, drawn to whichever number is currently chosen. */}
          <line
            x1="50"
            y1="50"
            x2={hand.x}
            y2={hand.y}
            stroke="var(--color-green)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx={hand.x} cy={hand.y} r="8.5" fill="var(--color-green)" />
          <circle cx="50" cy="50" r="2" fill="var(--color-green)" />

          {numbers.map((n, i) => {
            const p = pointAt(i, 12, 34);
            const active = i === activeIndex;
            return (
              <g key={n}>
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-[8px] ${active ? "fill-white" : "fill-ink-2"}`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {face === "minute" ? String(n).padStart(2, "0") : n}
                </text>
                {/* A generous invisible target over each number: the text itself
                    is far too small to hit reliably with a thumb. */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9"
                  fill="transparent"
                  className="cursor-pointer"
                  role="button"
                  aria-label={face === "hour" ? `${n} o'clock` : `${n} minutes`}
                  onClick={() => {
                    if (face === "hour") {
                      write(n, minute, isPm);
                      setFace("minute");
                    } else {
                      write(hour12, n, isPm);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Time</span>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[11px] bg-surface px-4 py-2.5 text-center text-small text-ink outline-none focus:ring-2 focus:ring-green"
        />
      </label>
    </div>
  );
}
