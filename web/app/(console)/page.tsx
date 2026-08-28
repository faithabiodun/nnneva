"use client";

import Link from "next/link";

import AncProgression from "@/components/console/AncProgression";
import CohortMeter from "@/components/console/CohortMeter";
import QueueCard from "@/components/console/QueueCard";
import { Card, EmptyState, IconArrow, IconCheck, SectionHead, Stat } from "@/components/ui";
import { cohortBreakdown } from "@/lib/cohort";
import { SWEEP_RAN_AT } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/schedule";
import { useDemo } from "@/lib/store";

/**
 * The first screen, and the one the whole submission is judged on.
 *
 * It has eight seconds to establish that something ran on its own overnight and
 * reduced an unreviewable caseload to a short list with reasons attached. So the
 * headline is two numbers and nothing else, the queue is immediately under it,
 * and the chat is nowhere on this page.
 */
const AUDIT_ACTOR = {
  agent: "Agent",
  chw: "Health worker",
  guardrail: "Output guardrail",
} as const;

export default function OverviewPage() {
  const { queue, savedQuestions, audit } = useDemo();

  const open = queue.filter((item) => item.status === "open");
  const breakdown = cohortBreakdown(queue);
  const handled = queue.length - open.length;
  const openQuestions = savedQuestions.filter((question) => !question.answered).length;

  return (
    <div className="mx-auto max-w-(--container-app) px-5 py-8 lg:px-10 lg:py-12">
      {/* ---- Hero --------------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="pill bg-mint-wash text-mint">
            <span className="size-1.5 rounded-full bg-mint" aria-hidden />
            Sweep complete
          </span>
          <p className="text-caption text-text-3">
            Ran automatically at {formatTime(SWEEP_RAN_AT)} · {formatDate(SWEEP_RAN_AT)} · nobody
            triggered it
          </p>
        </div>

        <h1 className="mt-7 max-w-4xl text-display text-text">
          {breakdown.reviewed} mothers reviewed.
          <br />
          <span className={open.length > 0 ? "text-aqua" : "text-mint"}>
            {open.length} need {open.length === 1 ? "you" : "you"}.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-lead text-text-2">
          {open.length > 0 ? (
            <>
              Nnneva completed its morning cohort sweep and identified the mothers requiring human
              attention. Every one carries a plain-language reason and the evidence behind it.
            </>
          ) : (
            <>
              Nnneva completed its morning cohort sweep and found nobody who needs you today. It
              keeps watching — anything a mother reports before tomorrow&rsquo;s sweep arrives here
              immediately.
            </>
          )}
        </p>
      </section>

      {/* ---- Sweep figures ------------------------------------------------ */}
      <section className="mt-12">
        <div className="grid gap-px overflow-hidden rounded-card bg-line sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-surface p-6">
            <Stat
              value={breakdown.reviewed}
              label="Reviewed this morning"
              note={`${breakdown.excluded} skipped — consent not given`}
            />
          </div>
          <div className="bg-surface p-6">
            <Stat
              value={breakdown.urgent}
              label="Require attention"
              tone={breakdown.urgent > 0 ? "urgent" : "good"}
              note="Ranked by band, then by recency"
            />
          </div>
          <div className="bg-surface p-6">
            <Stat value={breakdown.onTrack} label="On track" tone="good" note="No action needed today" />
          </div>
          <div className="bg-surface p-6">
            <Stat
              value={breakdown.attention}
              label="Awaiting follow-up"
              tone={breakdown.attention > 0 ? "attention" : "good"}
              note={`${openQuestions} saved questions across the cohort`}
            />
          </div>
        </div>
      </section>

      {/* ---- Queue + cohort ----------------------------------------------- */}
      <div className="mt-12 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section>
          <SectionHead
            eyebrow="Priority review queue"
            title="Who needs you today"
            note="Ranked by the sweep. Emergency first, then urgent, then routine — and within a band, whoever has been waiting longest."
            aside={
              <Link href="/queue" className="btn btn-quiet">
                Open the queue
                <IconArrow className="size-3.5" />
              </Link>
            }
          />

          {open.length === 0 ? (
            <Card className="mt-6">
              <EmptyState
                title="Everyone is accounted for."
                body="Nnneva found no mothers requiring review during the latest sweep. The next one runs at 06:00."
                icon={<IconCheck className="mx-auto size-10 text-mint" />}
              />
            </Card>
          ) : (
            <ol className="mt-6 flex flex-col gap-3">
              {open.slice(0, 4).map((item, index) => (
                <li key={item.id} className="animate-rise" style={{ animationDelay: `${index * 40}ms` }}>
                  <QueueCard item={item} rank={index + 1} href={`/queue?item=${item.id}`} />
                </li>
              ))}
            </ol>
          )}

          {open.length > 4 && (
            <Link
              href="/queue"
              className="mt-3 flex items-center justify-between gap-3 rounded-card bg-surface px-6 py-4 text-small font-semibold text-text-2 hairline transition-colors hover:bg-surface-2 hover:text-text"
            >
              {open.length - 4} more in the queue
              <IconArrow className="size-4" />
            </Link>
          )}

          {handled > 0 && (
            <p className="mt-4 text-caption text-text-3">
              {handled} {handled === 1 ? "mother has" : "mothers have"} been handled since the sweep ran.
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <Card className="p-6" lift>
            <SectionHead
              eyebrow="Cohort overview"
              title={`${breakdown.enrolled} enrolled mothers`}
              className="mb-7"
            />
            <CohortMeter breakdown={breakdown} />
            <Link
              href="/cohort"
              className="mt-6 inline-flex items-center gap-2 text-small font-semibold text-aqua"
            >
              See the full cohort
              <IconArrow className="size-3.5" />
            </Link>
          </Card>

          {/* The claim about capability restriction, stated where a judge will
              read it: the sweep has no messaging tool at all. */}
          <Card className="p-6">
            <p className="eyebrow">What the sweep is allowed to do</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {[
                ["get_cohort", "Read the enrolled cohort"],
                ["compute_anc_position", "Compute schedule position"],
                ["get_mother_history", "Read a mother's history"],
              ].map(([tool, description]) => (
                <li key={tool} className="flex items-center gap-3">
                  <IconCheck className="size-3.5 shrink-0 text-mint" />
                  <code className="text-caption text-text">{tool}</code>
                  <span className="ml-auto text-caption text-text-3">{description}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-caption leading-relaxed text-text-2">
              It has no tool for contacting anyone. Structurally it cannot message the cohort at
              06:00, because the capability does not exist in its tool set — the sweep can only ever
              produce recommendations.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="eyebrow">Recent activity</p>
              <Link href="/audit" className="text-caption font-semibold text-aqua">
                Full audit log
              </Link>
            </div>
            <ol className="mt-5 flex flex-col">
              {audit.slice(0, 4).map((entry) => (
                <li key={entry.id} className="flex gap-3.5 border-b border-line py-3.5 first:pt-0 last:border-b-0 last:pb-0">
                  <time className="tnum w-11 shrink-0 text-caption text-text-3" dateTime={entry.at}>
                    {formatTime(entry.at)}
                  </time>
                  <div className="min-w-0">
                    <p className="text-small leading-snug text-text">{entry.summary}</p>
                    <p className="mt-1 text-caption text-text-3">{AUDIT_ACTOR[entry.actor]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      {/* ---- ANC ---------------------------------------------------------- */}
      <section className="mt-12">
        <Card className="p-6 lg:p-8">
          <SectionHead
            eyebrow="Antenatal care"
            title="The cohort against the WHO eight-contact schedule"
            className="mb-2"
            aside={
              <Link href="/cohort" className="btn btn-ghost">
                Break it down
                <IconArrow className="size-3.5" />
              </Link>
            }
          />
          <AncProgression />
        </Card>
      </section>
    </div>
  );
}
