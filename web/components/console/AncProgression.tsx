import { ancProgression, scheduleAdherence } from "@/lib/cohort";

/**
 * Where the whole cohort sits against the WHO eight-contact model.
 *
 * Each column is one contact; the bar height is how many mothers are working
 * towards it, and the red foot is how many of those have already missed its
 * window. Read left to right it is the shape of a pregnancy cohort — a bulge in
 * the second trimester, thinning towards term.
 */
export default function AncProgression() {
  const stages = ancProgression();
  const adherence = scheduleAdherence();
  const peak = Math.max(...stages.map((stage) => stage.active), 1);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-caption text-text-3">
          Mothers working towards each contact, and how many have missed its window
        </p>
        <p className="text-caption text-text-3">
          <span className="tnum text-h3 font-semibold text-mint">{adherence}%</span> of due contacts
          completed
        </p>
      </div>

      <div className="scroll-x mt-6 -mx-1 px-1 pb-1">
        <ol className="flex min-w-[560px] items-end gap-2.5" style={{ height: 168 }}>
          {stages.map((stage) => {
            const activeHeight = Math.round((stage.active / peak) * 128);
            const missedHeight =
              stage.missed === 0 ? 0 : Math.max(4, Math.round((stage.missed / peak) * 128));

            return (
              <li key={stage.index} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2.5">
                <p className="tnum text-center text-caption font-semibold text-text-2">
                  {stage.active}
                </p>

                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-[6px] bg-surface-2"
                  style={{ height: Math.max(activeHeight, 6) }}
                  title={`Contact ${stage.index}, week ${stage.targetWeek}: ${stage.active} mothers, ${stage.missed} missed`}
                >
                  <span className="w-full flex-1 bg-teal/55" />
                  {missedHeight > 0 && (
                    <span className="w-full shrink-0 bg-red" style={{ height: missedHeight }} />
                  )}
                </div>

                <div className="text-center">
                  <p className="tnum text-caption font-semibold text-text-3">{stage.index}</p>
                  <p className="tnum text-micro font-medium tracking-normal text-text-3">
                    wk {stage.targetWeek}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Legend className="bg-teal/55" label="Working towards it" />
        <Legend className="bg-red" label="Window already missed" />
        <p className="text-caption text-text-3">
          WHO recommendations on antenatal care, 2016 — eight contacts
        </p>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-[3px] ${className}`} aria-hidden />
      <span className="text-caption text-text-3">{label}</span>
    </span>
  );
}
