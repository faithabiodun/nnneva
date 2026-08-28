import type { CohortBreakdown } from "@/lib/cohort";
import { STATE_STYLE } from "@/components/ui";

/**
 * The cohort, in one figure.
 *
 * One visualisation rather than six: a single ring carrying the whole reviewed
 * cohort, segment lengths proportional to the counts, with the on-track share
 * in the middle. The ring reads correctly at a glance from across a room, which
 * is the actual use — a health worker glancing at a shared desktop, not an
 * analyst studying a dashboard.
 *
 * Segment order is deliberate: urgent first, clockwise from the top, so the
 * thing that matters starts at twelve o'clock even when it is three percent.
 */

const SIZE = 208;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** A hair of blank between segments so adjacent colours never touch. */
const GAP = 2.5;

const SEGMENT_COLOR = {
  urgent: "var(--color-red)",
  attention: "var(--color-amber)",
  onTrack: "var(--color-mint)",
  excluded: "var(--color-text-3)",
} as const;

export default function CohortMeter({ breakdown }: { breakdown: CohortBreakdown }) {
  const total = breakdown.reviewed || 1;

  // Urgent, then attention, then on track — laid out clockwise from 12 o'clock.
  const ordered = [
    { state: "urgent" as const, count: breakdown.urgent },
    { state: "attention" as const, count: breakdown.attention },
    { state: "onTrack" as const, count: breakdown.onTrack },
  ];

  let offset = 0;
  const segments = ordered.map(({ state, count }) => {
    const length = (count / total) * CIRCUMFERENCE;
    const segment = {
      state,
      count,
      // A zero-count band draws nothing rather than a stray dot.
      dash: count === 0 ? 0 : Math.max(0, length - GAP),
      offset,
    };
    offset += length;
    return segment;
  });

  const onTrackPercent = breakdown.bands.find((band) => band.state === "onTrack")?.percent ?? 0;

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
      <div className="relative shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${breakdown.reviewed} mothers reviewed: ${breakdown.onTrack} on track, ${breakdown.attention} needing attention, ${breakdown.urgent} needing urgent review.`}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-surface-3)"
            strokeWidth={STROKE}
          />
          {segments.map((segment) => (
            <circle
              key={segment.state}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={SEGMENT_COLOR[segment.state]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </svg>

        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="tnum text-[44px] leading-none font-semibold tracking-[-0.035em] text-text">
              {onTrackPercent}%
            </p>
            <p className="mt-1.5 text-caption text-text-3">on track</p>
          </div>
        </div>
      </div>

      <dl className="w-full min-w-0 flex-1">
        {breakdown.bands.map((band) => (
          <div
            key={band.state}
            className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0"
          >
            <span
              className={`size-2 shrink-0 rounded-full ${STATE_STYLE[band.state].dot}`}
              aria-hidden
            />
            <dt className="min-w-0 flex-1 text-small text-text-2">{band.label}</dt>
            <dd className="tnum text-small font-semibold text-text">{band.count}</dd>
            <dd className="tnum w-11 text-right text-caption text-text-3">{band.percent}%</dd>
          </div>
        ))}

        <div className="mt-4 flex items-center gap-3 rounded-icon bg-surface-2 px-3 py-2.5">
          <span className="size-2 shrink-0 rounded-full bg-text-3" aria-hidden />
          <p className="min-w-0 flex-1 text-caption text-text-3">
            Not reviewed — consent not given
          </p>
          <p className="tnum text-caption font-semibold text-text-2">{breakdown.excluded}</p>
        </div>
      </dl>
    </div>
  );
}
