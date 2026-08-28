"use client";

import Link from "next/link";

import AncStrip from "./AncStrip";
import { BandPill, Card, EvidenceIcon, Field, IconArrow, IconCheck, IconTriage } from "@/components/ui";
import { completedCount, formatDate, relativeDays } from "@/lib/schedule";
import type { Mother, PendingAction, QueueItem, SavedQuestion } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Drafts for mother-facing actions                                            */
/* -------------------------------------------------------------------------- */

/**
 * The agent proposes; the health worker disposes. These drafts are templates,
 * not model output — same reasoning as the escalation text. The single
 * highest-stakes sentence Nnneva sends is the one it is least willing to let a
 * model improvise.
 */
function draftMessage(mother: Mother, item: QueueItem): string {
  const first = mother.name.split(" ")[0];
  if (item.band === "emergency") {
    return `Hello ${first}, this is your health worker at the centre. I have seen what you reported. Please come to the facility now, or call ${mother.emergencyContact.name} on ${mother.emergencyContact.phone} to bring you. Reply here when you are on your way.`;
  }
  if (item.band === "urgent") {
    return `Hello ${first}, this is your health worker at the centre. I would like to see you today about what you reported. Can you come in this morning? If getting here is difficult, tell me and we will find a way.`;
  }
  return `Hello ${first}, this is your health worker at the centre. I am checking in — your next antenatal contact is coming up. Is there anything you would like me to look at when you come?`;
}

const ACTIONS: {
  tool: PendingAction["tool"];
  label: string;
  reason: string;
  primary?: boolean;
}[] = [
  {
    tool: "send_message",
    label: "Send a message",
    reason:
      "This will deliver a message to her phone under your name. She will see it as coming from you, not from Nnneva.",
    primary: true,
  },
  {
    tool: "flag_for_clinical_review",
    label: "Flag for clinical review",
    reason: "This puts her in front of a clinician with the reasoning and the evidence attached.",
  },
  {
    tool: "mark_as_contacted",
    label: "Mark as contacted",
    reason: "This clears her from today's queue. Tomorrow's sweep will still see her.",
  },
];

/* -------------------------------------------------------------------------- */

/**
 * Why this mother is in the queue, what the agent saw, and what you can do
 * about it — in that order, because that is the order a health worker with
 * ninety seconds actually needs it in.
 */
export default function ReviewPanel({
  item,
  mother,
  savedQuestions,
  onAction,
}: {
  item: QueueItem;
  mother: Mother;
  savedQuestions: SavedQuestion[];
  onAction: (action: PendingAction) => void;
}) {
  const open = savedQuestions.filter((q) => q.motherId === mother.id && !q.answered);
  const urgent = item.band === "urgent" || item.band === "emergency";

  function propose(tool: PendingAction["tool"], label: string, reason: string) {
    onAction({
      tool,
      motherId: mother.id,
      label,
      reason,
      preview:
        tool === "send_message"
          ? draftMessage(mother, item)
          : tool === "flag_for_clinical_review"
            ? `${mother.name} will be added to the clinical review list with the sweep's reasoning and all ${item.evidence.length} pieces of evidence attached. No message is sent to her.`
            : `${mother.name} will be cleared from today's queue. Nothing is sent to her, and she remains in the cohort for tomorrow's sweep.`,
    });
  }

  return (
    <Card as="article" lift className="overflow-hidden">
      {/* ---- Identity ----------------------------------------------------- */}
      <header className="border-b border-line p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-h1">{mother.name}</h2>
            <p className="mt-2 text-small text-text-2">
              {mother.gestationalWeek} weeks · {mother.age} years · {mother.village} · contact{" "}
              {completedCount(mother.ancContacts)} of 8
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BandPill band={item.band} />
            {item.status !== "open" && (
              <span className="pill bg-mint-wash text-mint">
                <IconCheck className="size-3.5" />
                {item.status === "contacted" ? "Contacted" : "Flagged"}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/mothers/${mother.id}`}
          className="mt-5 inline-flex items-center gap-2 text-small font-semibold text-aqua"
        >
          Open her full profile
          <IconArrow className="size-3.5" />
        </Link>
      </header>

      {/* ---- Why ---------------------------------------------------------- */}
      <section
        className={`border-b border-line p-6 lg:p-7 ${urgent ? "bg-surface-2/60" : ""}`}
      >
        <p className="eyebrow">Why Nnneva flagged this mother</p>
        <p className="mt-4 text-lead leading-relaxed text-text">{item.reason}</p>
        <p className="mt-4 text-caption text-text-3">
          Produced by the{" "}
          {item.source === "sweep"
            ? "06:00 cohort sweep"
            : "triage layer, in the same request as her message"}
          . Recommendation: human follow-up.
        </p>
      </section>

      {/* ---- Evidence ----------------------------------------------------- */}
      <section className="border-b border-line p-6 lg:p-7">
        <p className="eyebrow">The evidence behind it</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {item.evidence.map((evidence, index) => (
            <li key={index} className="well flex gap-3.5 p-4">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-icon bg-surface-3 text-text-2">
                <EvidenceIcon kind={evidence.kind} className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-small font-semibold text-text">{evidence.label}</p>
                <p className="mt-1.5 text-small leading-relaxed text-text-2">{evidence.detail}</p>
                {evidence.at && (
                  <p className="mt-2 text-caption text-text-3">
                    {formatDate(evidence.at)} · {relativeDays(evidence.at)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Schedule ----------------------------------------------------- */}
      <section className="border-b border-line p-6 lg:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="eyebrow">WHO eight-contact schedule</p>
          <p className="tnum text-caption text-text-3">
            {completedCount(mother.ancContacts)} of 8 completed
          </p>
        </div>
        <div className="mt-4">
          <AncStrip contacts={mother.ancContacts} gestationalWeek={mother.gestationalWeek} />
        </div>
      </section>

      {/* ---- Saved questions ---------------------------------------------- */}
      {open.length > 0 && (
        <section className="border-b border-line p-6 lg:p-7">
          <p className="eyebrow">Saved for her next contact</p>
          <p className="mt-2 text-caption text-text-3">
            Questions the corpus did not cover. Nnneva did not answer these — it saved them for you.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {open.map((question) => (
              <li key={question.id} className="well px-4 py-3.5">
                <p className="text-small leading-relaxed text-text">“{question.text}”</p>
                <p className="mt-1.5 text-caption text-text-3">{relativeDays(question.at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Record ------------------------------------------------------- */}
      <section className="border-b border-line p-6 lg:p-7">
        <p className="eyebrow">Record</p>
        <dl className="mt-2 divide-y divide-line">
          <Field label="Due date">{formatDate(mother.dueDate)}</Field>
          <Field label="Last inbound message">{relativeDays(mother.lastInboundAt)}</Field>
          <Field label="Phone">{mother.phone}</Field>
          <Field label="Emergency contact">
            {mother.emergencyContact.name} ({mother.emergencyContact.relationship})
            <br />
            <span className="text-text-3">{mother.emergencyContact.phone}</span>
          </Field>
          <Field label="Consent to sweep">
            {mother.consent ? (
              <span className="text-mint">Given</span>
            ) : (
              <span className="text-red-text">Not given — excluded</span>
            )}
          </Field>
        </dl>
      </section>

      {/* ---- Actions ------------------------------------------------------ */}
      <section className="bg-surface-2/50 p-6 lg:p-7">
        <span className="inline-flex items-center gap-2 text-amber">
          <IconTriage className="size-3.5" />
          <span className="eyebrow text-amber">Human in the loop</span>
        </span>
        <p className="mt-3 max-w-xl text-small leading-relaxed text-text-2">
          Every action here is proposed by the agent and paused at the tool boundary until you
          confirm it. Nnneva cannot release its own proposals.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.tool}
              type="button"
              className={`btn ${action.primary ? "btn-aqua" : "btn-quiet"}`}
              onClick={() => propose(action.tool, action.label, action.reason)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </Card>
  );
}
