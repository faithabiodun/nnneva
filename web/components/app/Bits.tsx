"use client";

import type { ReactNode } from "react";

/**
 * A row of filter chips. The selected one inverts to ink so the current filter
 * reads at a glance rather than by comparing weights.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className="scroll-x -mx-1 flex gap-2 px-1 pb-1" role="group" aria-label={label}>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o)}
            className={`shrink-0 rounded-pill px-4 py-2.5 text-caption transition-colors ${
              on ? "bg-ink text-white" : "bg-white text-muted hover:bg-surface"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** The tick box used by every checkable row in the app. */
export function TickBox({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-[6px] transition-colors ${
        on ? "bg-green" : "bg-surface-3"
      }`}
      style={{ width: size, height: size }}
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
  );
}

/**
 * A switch that carries its own label and description, so the whole row is one
 * hit target instead of a small thumb next to unrelated text.
 */
export function ToggleRow({
  label,
  sub,
  on,
  onToggle,
}: {
  label: string;
  sub: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center gap-4 border-t border-line py-3.5 text-left first:border-t-0"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-small text-ink">{label}</span>
        <span className="mt-0.5 block text-caption text-faint">{sub}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-6.5 w-11 shrink-0 rounded-pill transition-colors ${
          on ? "bg-green" : "bg-[#E6E1DD]"
        }`}
      >
        <span
          className="absolute top-[3px] size-[19px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left]"
          style={{ left: on ? 22 : 3 }}
        />
      </span>
    </button>
  );
}

/** A small labelled read-only field, used by the profile context and account tabs. */
export function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1.5 text-caption text-muted">{label}</dt>
      <dd className="rounded-md bg-surface px-4 py-3 text-small text-ink-2">{value}</dd>
    </div>
  );
}

/** The uppercase section label the design uses above a card's contents. */
export function CardLabel({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-faint">{children}</p>;
}
