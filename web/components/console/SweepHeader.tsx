import { COHORT_STATS, SWEEP_RAN_AT } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/schedule";

/**
 * The first thing anyone sees. It has one job: establish within eight seconds
 * that something ran on its own and reduced a caseload to a short list.
 */
export default function SweepHeader({ needsYou }: { needsYou: number }) {
  return (
    <section className="border-b border-stone bg-sand">
      <div className="mx-auto max-w-(--container-page) px-5 py-10 md:py-14">
        <div className="flex flex-wrap items-center gap-3">
          <span className="pill bg-ink text-white">
            <span className="size-1.5 rounded-full bg-mint" aria-hidden />
            Sweep complete
          </span>
          <p className="text-[14px] text-muted">
            Ran automatically at {formatTime(SWEEP_RAN_AT)} · {formatDate(SWEEP_RAN_AT)} · nobody triggered it
          </p>
        </div>

        <h1 className="mt-6 max-w-4xl text-headline font-display text-charcoal">
          <span className="text-ink">{COHORT_STATS.reviewed} mothers reviewed automatically.</span>{" "}
          <span className="text-muted">
            {needsYou} need {needsYou === 1 ? "you" : "you"}.
          </span>
        </h1>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-card bg-stone sm:grid-cols-3">
          <Stat label="Enrolled in cohort" value={COHORT_STATS.enrolled} note="Across the programme" />
          <Stat
            label="Reviewed this morning"
            value={COHORT_STATS.reviewed}
            note={`${COHORT_STATS.excluded} excluded — consent not given`}
          />
          <Stat label="Queued for you" value={needsYou} note="Ranked by band, then recency" />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="bg-white px-6 py-5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 font-display text-[36px] leading-none tracking-[-0.02em] text-ink">{value}</dd>
      <p className="mt-2 text-[13px] text-muted">{note}</p>
    </div>
  );
}
