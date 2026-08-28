import type { ReactNode } from "react";

import type { CohortState } from "@/lib/cohort";
import type { TriageBand } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Band and state colour                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Colour is meaning in this system, so band styling lives here rather than
 * being spelled out at each call site. Mint is on track, amber is attention,
 * red is urgent — and red appears nowhere else in the product.
 */
export const BAND_STYLE: Record<
  TriageBand,
  { label: string; pill: string; rail: string; dot: string; text: string }
> = {
  emergency: {
    label: "Emergency",
    pill: "bg-red text-[#2a0705]",
    rail: "bg-red",
    dot: "bg-red",
    text: "text-red",
  },
  urgent: {
    label: "Urgent",
    pill: "bg-amber text-[#3a2600]",
    rail: "bg-amber",
    dot: "bg-amber",
    text: "text-amber",
  },
  routine: {
    label: "Routine",
    pill: "bg-mint/15 text-mint",
    rail: "bg-mint",
    dot: "bg-mint",
    text: "text-mint",
  },
};

export const STATE_STYLE: Record<CohortState, { label: string; dot: string; text: string; fill: string }> = {
  onTrack: { label: "On track", dot: "bg-mint", text: "text-mint", fill: "bg-mint" },
  attention: { label: "Needs attention", dot: "bg-amber", text: "text-amber", fill: "bg-amber" },
  urgent: { label: "Urgent review", dot: "bg-red", text: "text-red", fill: "bg-red" },
  excluded: { label: "Not consented", dot: "bg-text-3", text: "text-text-3", fill: "bg-text-3" },
};

export function BandPill({ band, className = "" }: { band: TriageBand; className?: string }) {
  const style = BAND_STYLE[band];
  return <span className={`pill ${style.pill} ${className}`}>{style.label}</span>;
}

export function StateDot({ state, className = "" }: { state: CohortState; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${STATE_STYLE[state].dot}`} aria-hidden />
      <span className="text-caption text-text-2">{STATE_STYLE[state].label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                           */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  lift = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  lift?: boolean;
  as?: "div" | "section" | "article" | "li" | "aside";
}) {
  return <Tag className={`${lift ? "card-lift" : "card"} ${className}`}>{children}</Tag>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/** Section heading with an optional right-hand slot, used across the console. */
export function SectionHead({
  eyebrow,
  title,
  note,
  aside,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  note?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h2 className="text-h2">{title}</h2>
        {note && <p className="mt-2 max-w-2xl text-small text-text-2">{note}</p>}
      </div>
      {aside}
    </div>
  );
}

/** A labelled row in a record. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-caption text-text-3">{label}</dt>
      <dd className="text-right text-small text-text">{children}</dd>
    </div>
  );
}

/** A big number with its label. The console's basic unit of reassurance. */
export function Stat({
  value,
  label,
  note,
  tone = "default",
}: {
  value: ReactNode;
  label: string;
  note?: string;
  tone?: "default" | "attention" | "urgent" | "good";
}) {
  const toneClass = {
    default: "text-text",
    good: "text-mint",
    attention: "text-amber",
    urgent: "text-red",
  }[tone];

  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={`tnum mt-3 text-[clamp(34px,4vw,52px)] leading-none font-semibold tracking-[-0.03em] ${toneClass}`}>
        {value}
      </p>
      {note && <p className="mt-2.5 text-caption text-text-3">{note}</p>}
    </div>
  );
}

/**
 * Empty states carry weight in this product — "nothing here" is the outcome the
 * whole system is working towards, so it gets a real sentence rather than a
 * shrug.
 */
export function EmptyState({
  title,
  body,
  icon,
  className = "",
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid place-items-center px-6 py-16 text-center ${className}`}>
      <div className="max-w-sm">
        {icon ?? <MarkLife className="mx-auto size-12 text-mint/45" />}
        <p className="mt-5 text-h3 text-text">{title}</p>
        <p className="mt-2 text-small text-text-2">{body}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons — inline, so the project stays dependency-free                        */
/* -------------------------------------------------------------------------- */

type IconProps = { className?: string };

export function IconSchedule({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconMessage({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 3.5h10A1.5 1.5 0 0 1 14.5 5v5a1.5 1.5 0 0 1-1.5 1.5H8l-3.5 2.4V11.5H3A1.5 1.5 0 0 1 1.5 10V5A1.5 1.5 0 0 1 3 3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSilence({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.4V8l2.6 1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconFlag({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 14.2V2.4h8.2l-1.7 2.9 1.7 2.9H4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTriage({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.7 14 4.9v4.3c0 2.6-2.4 4.4-6 5.2-3.6-.8-6-2.6-6-5.2V4.9L8 1.7Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 5.4v3.2M8 10.8v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.4 8.4 6.4 11.4 12.6 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrow({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h9.5M8.8 4.2 12.6 8l-3.8 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconQuestion({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.3 6.1a1.75 1.75 0 1 1 2.3 1.66c-.4.14-.6.5-.6.9v.34" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 11.4v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconLedger({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 2.2h9v11.6l-2.2-1.5-2.3 1.5-2.3-1.5-2.2 1.5V2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6 5.6h4M6 8.3h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconCohort({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 2a6 6 0 0 1 5.2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconPeople({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6.2" cy="5.6" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.9 13.4c0-2.2 1.9-3.7 4.3-3.7s4.3 1.5 4.3 3.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 4.1a2.2 2.2 0 0 1 0 4.1M12 9.9c1.4.4 2.4 1.5 2.4 3.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconOverview({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5.2" height="6.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.8" y="2" width="5.2" height="4.2" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="10.1" width="5.2" height="3.9" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.8" y="7.9" width="5.2" height="6.1" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconQueue({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M5.6 3.6h8.6M5.6 8h8.6M5.6 12.4h8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="2.3" cy="3.6" r="1.2" fill="currentColor" />
      <circle cx="2.3" cy="8" r="1.2" fill="currentColor" opacity="0.55" />
      <circle cx="2.3" cy="12.4" r="1.2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function IconChat({ className = "size-4" }: IconProps) {
  return IconMessage({ className });
}

export function IconMenu({ className = "size-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className = "size-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7.2" cy="7.2" r="4.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.6 10.6 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const EVIDENCE_ICONS = {
  schedule: IconSchedule,
  message: IconMessage,
  silence: IconSilence,
  flag: IconFlag,
  triage: IconTriage,
} as const;

export function EvidenceIcon({ kind, className }: { kind: keyof typeof EVIDENCE_ICONS; className?: string }) {
  const Icon = EVIDENCE_ICONS[kind];
  return <Icon className={className} />;
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The mark: an open protective arc around a held centre.
 *
 * Deliberately abstract. No pregnancy silhouette, no heart, no baby — the
 * product's claim is watchfulness over a cohort, and a figurative bump mark
 * would say "pregnancy app" in exactly the way section 27 of the brief warns
 * against. The gap in the arc is the point: this is care that stays open, not a
 * closed ring.
 */
export function MarkLife({ className = "size-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.5 12a8.5 8.5 0 1 0-4.6 7.56"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const markColor = tone === "dark" ? "text-aqua" : "text-teal";
  const textColor = tone === "dark" ? "text-text" : "text-ink";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <MarkLife className={`size-6 shrink-0 ${markColor}`} />
      <span className={`text-[19px] font-semibold tracking-[-0.03em] ${textColor}`}>Nnneva</span>
    </span>
  );
}
