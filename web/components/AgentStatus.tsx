"use client";

import { COHORT_STATS, SWEEP_RAN_AT } from "@/lib/fixtures";
import { formatTime } from "@/lib/schedule";

/**
 * The agent indicator.
 *
 * This is the piece that has to say "something is running whether or not you
 * are here" without saying it in words. So: no robot, no sci-fi, no spinner —
 * a slow breathing dot and a bar that has already finished. The sweep is not
 * happening now; it happened at 06:00 while nobody was watching, and that is
 * the more interesting claim.
 */
export default function AgentStatus({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`well ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <span className="relative grid size-2 place-items-center" aria-hidden>
            <span className="absolute size-2 rounded-full bg-aqua/70 animate-breathe" />
            <span className="size-1.5 rounded-full bg-aqua" />
          </span>
          <span className="eyebrow text-text-2">Nnneva agent</span>
        </span>
        <span className="text-micro text-mint">ACTIVE</span>
      </div>

      <p className="mt-3 text-caption text-text-3">
        Last sweep <span className="text-text-2">{formatTime(SWEEP_RAN_AT)}</span> · next 06:00
      </p>

      {/* A completed pass, with a light travelling over it — the residue of
          something that ran, not a progress bar for something in flight. */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3" role="presentation">
        <div className="relative h-full w-full bg-aqua/35">
          <span className="absolute inset-y-0 w-1/3 bg-aqua/80 animate-sweep" />
        </div>
      </div>

      <p className="mt-2.5 text-caption text-text-3">
        <span className="tnum text-text-2">{COHORT_STATS.reviewed}</span> of{" "}
        <span className="tnum">{COHORT_STATS.enrolled}</span> mothers reviewed
        <span className="block text-text-3">
          {COHORT_STATS.excluded} skipped — consent not given
        </span>
      </p>
    </div>
  );
}
