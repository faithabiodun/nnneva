"use client";

import Link from "next/link";

import { SWEEP_RAN_AT, motherById } from "@/lib/fixtures";
import { relativeDays } from "@/lib/schedule";
import type { QueueItem } from "@/lib/types";

import { BAND_STYLE, BandPill, IconArrow, IconCheck } from "@/components/ui";

/**
 * One item in the ranked queue.
 *
 * The rank numeral is the whole idea of the screen — 01 is not a decoration, it
 * is the agent's claim about who to call first. So it sits at the top left in
 * tabular figures and never moves.
 *
 * Rendered two ways: as a link (the overview, where clicking goes to the full
 * queue) and as a button (the queue page, where clicking selects into the
 * detail panel beside it).
 */
export default function QueueCard({
  item,
  rank,
  selected = false,
  onSelect,
  href,
}: {
  item: QueueItem;
  rank: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  href?: string;
}) {
  const mother = motherById(item.motherId);
  const urgent = item.band === "urgent" || item.band === "emergency";
  // Anything raised after the sweep arrived while the health worker was looking.
  const isNew = item.source === "triage" && item.createdAt > SWEEP_RAN_AT;

  const body = (
    <>
      {/* The band rail. The only place colour runs to a card edge. */}
      <span
        className={`absolute inset-y-4 left-0 w-[3px] rounded-r-full ${BAND_STYLE[item.band].rail}`}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="rank shrink-0 pt-0.5">{String(rank).padStart(2, "0")}</span>
          <div className="min-w-0">
            <p className="truncate text-h3 text-text">{mother?.name ?? item.motherId}</p>
            <p className="mt-1 text-caption text-text-3">
              {mother ? `${mother.gestationalWeek} weeks · ${mother.village}` : "—"}
            </p>
          </div>
        </div>
        <BandPill band={item.band} className="shrink-0" />
      </div>

      <p className="mt-4 text-small leading-relaxed text-text-2">{item.reason}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="chip bg-surface-2 text-text-3">
          {item.source === "sweep" ? "From the 06:00 sweep" : "Raised by triage"}
        </span>
        {isNew && <span className="chip bg-red/15 text-red">Just now</span>}
        {item.status !== "open" && (
          <span className="chip bg-mint/15 text-mint">
            <IconCheck className="size-3" />
            {item.status === "contacted" ? "Contacted" : "Flagged for review"}
          </span>
        )}
        <span className="chip bg-surface-2 text-text-3">{item.evidence.length} pieces of evidence</span>

        <span className="ml-auto inline-flex items-center gap-1.5 text-caption text-text-3">
          {relativeDays(item.createdAt)}
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              urgent ? "text-amber" : "text-aqua"
            }`}
          >
            {urgent ? "Review now" : "Review"}
            <IconArrow className="size-3.5" />
          </span>
        </span>
      </div>
    </>
  );

  const shell = `group relative block w-full overflow-hidden rounded-card p-5 pl-6 text-left transition-colors ${
    selected
      ? "bg-surface-3 shadow-[inset_0_0_0_1px_var(--color-aqua)]"
      : "bg-surface hairline hover:bg-surface-2"
  }`;

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.id)}
      aria-current={selected ? "true" : undefined}
      className={shell}
    >
      {body}
    </button>
  );
}
