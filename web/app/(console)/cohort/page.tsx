"use client";

import AncProgression from "@/components/console/AncProgression";
import CohortMeter from "@/components/console/CohortMeter";
import { Card, SectionHead, Stat } from "@/components/ui";
import { cohortBreakdown, cohortRows, medianGestationalWeek } from "@/lib/cohort";
import { COHORT } from "@/lib/fixtures";
import { useDemo } from "@/lib/store";

/**
 * The cohort as a whole — the unit of value the product is actually sold on.
 * A programme buys Nnneva for four hundred mothers, not for one.
 */
export default function CohortPage() {
  const { queue } = useDemo();
  const breakdown = cohortBreakdown(queue);
  const rows = cohortRows(queue);

  const consenting = COHORT.filter((mother) => mother.consent);
  const silent = rows.filter((row) => row.mother.consent && (row.silentFor === null || row.silentFor >= 14));
  const thirdTrimester = consenting.filter((mother) => mother.gestationalWeek >= 28).length;
  const medianWeek = medianGestationalWeek();

  return (
    <div className="mx-auto max-w-(--container-app) px-5 py-8 lg:px-10 lg:py-10">
      <SectionHead
        eyebrow="Cohort intelligence"
        title={`${breakdown.enrolled} enrolled mothers`}
        level={1}
        note="One primary health centre, one community health worker, and a caseload no human can read end to end. This is the whole of it, in the shape the sweep left it in this morning."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-6 lg:p-8" lift>
          <p className="eyebrow">After this morning&rsquo;s sweep</p>
          <div className="mt-7">
            <CohortMeter breakdown={breakdown} />
          </div>
        </Card>

        <div className="grid gap-px overflow-hidden rounded-card bg-line sm:grid-cols-2">
          <div className="bg-surface p-6">
            <Stat value={medianWeek} label="Median gestational week" note="Across consenting mothers" />
          </div>
          <div className="bg-surface p-6">
            <Stat value={thirdTrimester} label="In the third trimester" note="Week 28 and beyond" />
          </div>
          <div className="bg-surface p-6">
            <Stat
              value={silent.length}
              label="Silent two weeks or more"
              tone={silent.length > 0 ? "attention" : "good"}
              note="Includes mothers who have never written"
            />
          </div>
          <div className="bg-surface p-6">
            <Stat
              value={breakdown.excluded}
              label="Outside the sweep"
              note="Consent not given — never reasoned about"
            />
          </div>
        </div>
      </div>

      <Card className="mt-6 p-6 lg:p-8">
        <SectionHead
          eyebrow="Antenatal care"
          title="Progression against the WHO eight-contact model"
          className="mb-2"
        />
        <AncProgression />
      </Card>

      {/* The consent claim, stated plainly rather than buried in a settings
          page. This is health data about pregnant women. */}
      <Card className="mt-6 p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <p className="eyebrow">Consent and data minimisation</p>
            <p className="mt-4 text-lead leading-relaxed text-text">
              {breakdown.excluded} of {breakdown.enrolled} enrolled mothers have not given consent.
              The sweep does not reason about them at all.
            </p>
          </div>
          <div className="text-small leading-relaxed text-text-2">
            <p>
              Consent is a field on the mother record and it gates inclusion in the sweep, not merely
              what is displayed. A mother without it is counted in the cohort — a programme still
              needs to know she is enrolled — but no agent reads her history, and no queue item can
              be raised about her.
            </p>
            <p className="mt-4">
              The sweep also sees a reduced record rather than the whole one: schedule position,
              days since last contact, recent triage history. Not her phone number, and not her
              address. Every name in this build is synthetic.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
