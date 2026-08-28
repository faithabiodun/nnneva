"use client";

import Link from "next/link";

import AncStrip from "@/components/console/AncStrip";
import ConfirmDialog from "@/components/console/ConfirmDialog";
import {
  BandPill,
  Card,
  EmptyState,
  Field,
  IconArrow,
  IconCheck,
  STATE_STYLE,
  SectionHead,
} from "@/components/ui";
import { currentContact, pregnancyTimeline, stateForMother, type TimelineEvent } from "@/lib/cohort";
import { DEMO_MOTHER_ID, motherById } from "@/lib/fixtures";
import { completedCount, formatDate, relativeDays } from "@/lib/schedule";
import { useDemo } from "@/lib/store";
import { useState } from "react";
import type { PendingAction } from "@/lib/types";

/**
 * A premium patient profile rather than a spreadsheet row.
 *
 * The timeline is the point: it is the visible half of the memory claim. What
 * she reported in week 18 is still on screen in week 32 without anyone
 * replaying a transcript, which is what persistent pregnancy context buys.
 */
export default function MotherProfile({ id }: { id: string }) {
  const { queue, savedQuestions, chat, confirmAction } = useDemo();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const mother = motherById(id);
  if (!mother) {
    return (
      <div className="mx-auto max-w-(--container-read) px-5 py-10 lg:px-10">
        <Card>
          <EmptyState
            title="No such mother"
            body="That record is not in the enrolled cohort. She may have been discharged, or the link may be stale."
          />
        </Card>
      </div>
    );
  }

  const state = stateForMother(mother.id, queue);
  const items = queue.filter((item) => item.motherId === mother.id);
  const openItem = items.find((item) => item.status === "open");
  const questions = savedQuestions.filter((q) => q.motherId === mother.id && !q.answered);
  // Only the demo mother has a conversation in this build.
  const herChat = mother.id === DEMO_MOTHER_ID ? chat : [];
  const timeline = pregnancyTimeline(mother, items, savedQuestions, herChat);
  const pending_ = currentContact(mother.ancContacts);

  return (
    <div className="mx-auto max-w-(--container-app) px-5 py-8 lg:px-10 lg:py-10">
      <Link href="/mothers" className="inline-flex items-center gap-2 text-caption font-semibold text-text-3 hover:text-text">
        <IconArrow className="size-3.5 rotate-180" />
        All mothers
      </Link>

      {/* ---- Header ------------------------------------------------------- */}
      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-hxl">{mother.name}</h1>
          <p className="mt-3 text-lead text-text-2">
            {mother.gestationalWeek} weeks pregnant · antenatal contact{" "}
            {completedCount(mother.ancContacts)} of 8 · due {formatDate(mother.dueDate)}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 text-small font-semibold ${STATE_STYLE[state].text}`}
        >
          <span className={`size-2 rounded-full ${STATE_STYLE[state].dot}`} aria-hidden />
          {STATE_STYLE[state].label}
        </span>
      </header>

      {/* ---- Open flag ---------------------------------------------------- */}
      {openItem && (
        <Card className="mt-8 overflow-hidden" lift>
          <div className="border-b border-line p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="eyebrow">Why Nnneva flagged this mother</p>
              <BandPill band={openItem.band} />
            </div>
            <p className="mt-4 max-w-3xl text-lead leading-relaxed text-text">{openItem.reason}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-surface-2/50 p-6 lg:px-7">
            <p className="min-w-0 flex-1 text-caption text-text-3">
              {openItem.evidence.length} pieces of evidence, and every action paused at the tool
              boundary until you release it.
            </p>
            <Link href={`/queue?item=${openItem.id}`} className="btn btn-aqua">
              Review in the queue
              <IconArrow className="size-3.5" />
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ---- Timeline --------------------------------------------------- */}
        <Card className="p-6 lg:p-8">
          <SectionHead
            eyebrow="Pregnancy timeline"
            title="Everything Nnneva still remembers"
            note="Longitudinal context, kept across the whole pregnancy. Nothing here needed a transcript replayed to find it."
            className="mb-8"
          />
          <Timeline events={timeline} />
        </Card>

        <div className="flex flex-col gap-6">
          {/* ---- Schedule ------------------------------------------------- */}
          <Card className="p-6 lg:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="eyebrow">Antenatal care</p>
              <p className="tnum text-caption text-text-3">
                {completedCount(mother.ancContacts)} of 8 completed
              </p>
            </div>
            <div className="mt-5">
              <AncStrip contacts={mother.ancContacts} gestationalWeek={mother.gestationalWeek} />
            </div>
            {pending_ && (
              <p className="mt-5 text-small leading-relaxed text-text-2">
                Next is contact {pending_.index}, targeted at week {pending_.targetWeek}.{" "}
                {pending_.status === "missed" ? (
                  <span className="text-red-text">
                    Its window has already closed
                    {mother.gestationalWeek > pending_.targetWeek
                      ? ` — she is ${mother.gestationalWeek - pending_.targetWeek} ${
                          mother.gestationalWeek - pending_.targetWeek === 1 ? "week" : "weeks"
                        } past it.`
                      : " and no visit was recorded."}
                  </span>
                ) : pending_.status === "due" ? (
                  <span className="text-amber">It is due now.</span>
                ) : (
                  <span className="text-text-3">
                    That is {pending_.targetWeek - mother.gestationalWeek} weeks away.
                  </span>
                )}
              </p>
            )}
          </Card>

          {/* ---- Record --------------------------------------------------- */}
          <Card className="p-6 lg:p-7">
            <p className="eyebrow">Record</p>
            <dl className="mt-2 divide-y divide-line">
              <Field label="Age">{mother.age} years</Field>
              <Field label="Village">{mother.village}</Field>
              <Field label="Estimated due date">{formatDate(mother.dueDate)}</Field>
              <Field label="Enrolled">{formatDate(mother.enrolledAt)}</Field>
              <Field label="Last inbound message">{relativeDays(mother.lastInboundAt)}</Field>
              <Field label="Phone">{mother.phone}</Field>
              <Field label="Emergency contact">
                {mother.emergencyContact.name} ({mother.emergencyContact.relationship})
                <br />
                <span className="text-text-3">{mother.emergencyContact.phone}</span>
              </Field>
            </dl>
          </Card>

          {/* ---- Consent, never invisible --------------------------------- */}
          <Card className="p-6 lg:p-7">
            <p className="eyebrow">Consent</p>
            {mother.consent ? (
              <>
                <p className="mt-4 flex items-center gap-2.5 text-lead text-mint">
                  <IconCheck className="size-4" />
                  Data processing consent active
                </p>
                <p className="mt-3 text-small leading-relaxed text-text-2">
                  She is included in the cohort sweep. The sweep sees her schedule position, her
                  silence, and her recent triage history — not her phone number and not her address.
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-lead text-red-text">Consent not given</p>
                <p className="mt-3 text-small leading-relaxed text-text-2">
                  She is enrolled and counted, but excluded from every sweep. No agent reads her
                  history and no queue item can be raised about her.
                </p>
              </>
            )}
            <p className="mt-4 border-t border-line pt-4 text-caption text-text-3">
              Last updated {formatDate(mother.enrolledAt)}
            </p>
          </Card>

          {/* ---- Questions ------------------------------------------------ */}
          <Card className="p-6 lg:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="eyebrow">Saved for her next contact</p>
              <Link href="/questions" className="text-caption font-semibold text-aqua">
                All questions
              </Link>
            </div>
            {questions.length === 0 ? (
              <p className="mt-4 text-small text-text-3">
                Nothing saved. Everything she has asked was covered by the corpus.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {questions.map((question) => (
                  <li key={question.id} className="well px-4 py-3.5">
                    <p className="text-small leading-relaxed text-text">“{question.text}”</p>
                    <p className="mt-1.5 text-caption text-text-3">{relativeDays(question.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          action={pending}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            confirmAction(pending);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const EVENT_STYLE: Record<TimelineEvent["kind"], { dot: string; ring: string; label: string }> = {
  enrolled: { dot: "bg-text-3", ring: "bg-surface-3", label: "text-text-2" },
  contact: { dot: "bg-mint", ring: "bg-mint/20", label: "text-mint" },
  missed: { dot: "bg-red", ring: "bg-red/20", label: "text-red-text" },
  question: { dot: "bg-aqua", ring: "bg-aqua/20", label: "text-aqua" },
  flag: { dot: "bg-amber", ring: "bg-amber/20", label: "text-amber" },
  message: { dot: "bg-text-2", ring: "bg-surface-3", label: "text-text-2" },
  now: { dot: "bg-text", ring: "bg-text/20", label: "text-text" },
};

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative">
      {/* The spine. Stops at the last marker rather than running off the end. */}
      <span className="absolute top-2 bottom-4 left-[35px] w-px bg-line" aria-hidden />

      {events.map((event, index) => {
        const style = EVENT_STYLE[event.kind];
        return (
          <li key={index} className="relative flex gap-4 pb-7 last:pb-0">
            <span className="tnum w-8 shrink-0 pt-0.5 text-right text-caption font-semibold text-text-3">
              {event.week}
            </span>

            <span className={`relative z-10 mt-1 grid size-3.5 shrink-0 place-items-center rounded-full ${style.ring}`}>
              <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
            </span>

            <div className="min-w-0 flex-1 pb-0.5">
              <p className={`text-small font-semibold ${style.label}`}>{event.label}</p>
              {event.detail && (
                <p className="mt-1.5 text-small leading-relaxed text-text-2">{event.detail}</p>
              )}
              {event.at && <p className="mt-1.5 text-caption text-text-3">{formatDate(event.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
