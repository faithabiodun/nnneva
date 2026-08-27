import type { ReactNode } from "react";

import type { TriageBand } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Triage bands                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Band colour comes from the palette rather than a separate "semantic" set:
 * alert for emergency, honey for urgent, mint for routine.
 */
export const BAND_STYLE: Record<TriageBand, { pill: string; dot: string; label: string; rail: string }> = {
  emergency: {
    pill: "bg-alert text-white",
    dot: "bg-white",
    label: "Emergency",
    rail: "bg-alert",
  },
  urgent: {
    pill: "bg-honey text-ink",
    dot: "bg-ink",
    label: "Urgent",
    rail: "bg-honey",
  },
  routine: {
    pill: "bg-mint/15 text-[#067a41]",
    dot: "bg-mint",
    label: "Routine",
    rail: "bg-mint",
  },
};

export function BandPill({ band, className = "" }: { band: TriageBand; className?: string }) {
  const style = BAND_STYLE[band];
  return (
    <span className={`pill ${style.pill} ${className}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                           */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/** A labelled metadata row, used through the mother panel. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="text-right text-[14px] text-charcoal">{children}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons — inline so the project stays dependency-free                         */
/* -------------------------------------------------------------------------- */

type IconProps = { className?: string };

export function IconSchedule({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconMessage({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 3.5h10a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 11.5H8l-3.5 2.5v-2.5H3A1.5 1.5 0 0 1 1.5 10V5A1.5 1.5 0 0 1 3 3.5Z"
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
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconFlag({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 14V2.5h8l-1.6 2.75L12 8H4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTriage({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.8 14 5v4.2c0 2.6-2.4 4.4-6 5.2-3.6-.8-6-2.6-6-5.2V5l6-3.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 5.5v3.2M8 10.8v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrow({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
/* Wordmark                                                                    */
/* -------------------------------------------------------------------------- */

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid size-7 place-items-center rounded-full bg-ink text-[13px] font-semibold text-cream">
        n
      </span>
      <span className="font-display text-[19px] font-medium tracking-[-0.02em] text-ink">Nnneva</span>
    </span>
  );
}
