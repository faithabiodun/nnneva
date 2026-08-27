"use client";

import { relativeDays, formatDate, weeksOverdue } from "@/lib/schedule";
import type { AncContact, Mother, PendingAction, QueueItem, SavedQuestion } from "@/lib/types";

import { BandPill, EvidenceIcon, Field, IconCheck } from "../ui";

/* -------------------------------------------------------------------------- */
/* Draft text for mother-facing actions                                        */
/* -------------------------------------------------------------------------- */

/**
 * The agent proposes; the health worker disposes. These drafts are templates
 * rather than model output — the same reasoning as the escalation text.
 */
function draftMessage(mother: Mother, item: QueueItem): string {
  if (item.band === "emergency") {
    return `Hello ${mother.name.split(" ")[0]}, this is your health worker at the centre. I have seen what you reported. Please come to the facility now, or call ${mother.emergencyContact.name} on ${mother.emergencyContact.phone} to bring you. Reply here when you are on your way.`;
  }
  if (item.band === "urgent") {
    return `Hello ${mother.name.split(" ")[0]}, this is your health worker at the centre. I would like to see you today about what you reported. Can you come in this morning? If getting here is difficult, tell me and we will find a way.`;
  }
  return `Hello ${mother.name.split(" ")[0]}, this is your health worker at the centre. I am checking in — your next antenatal contact is coming up. Is there anything you would like me to look at when you come?`;
}

const ACTIONS: {
  tool: PendingAction["tool"];
  label: string;
  reason: string;
  variant: "ink" | "sand";
}[] = [
  {
    tool: "send_message",
    label: "Send a message",
    reason: "This will deliver a message to her phone under your name. She will see it as coming from you.",
    variant: "ink",
  },
  {
    tool: "flag_for_clinical_review",
    label: "Flag for clinical review",
    reason: "This puts her in front of a clinician with the reasoning and evidence attached.",
    variant: "sand",
  },
  {
    tool: "mark_as_contacted",
    label: "Mark as contacted",
    reason: "This clears her from today's queue. The sweep will still see her tomorrow.",
    variant: "sand",
  },
];

/* -------------------------------------------------------------------------- */

export default function MotherPanel({
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
    <article className="card overflow-hidden">
      {/* Identity */}
      <header className="border-b border-stone p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[28px] leading-tight tracking-[-0.02em] text-ink">
              {mother.name}
            </h2>
            <p className="mt-1 text-[14px] text-muted">
              {mother.gestationalWeek} weeks · {mother.age} years · {mother.village}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BandPill band={item.band} />
            {item.status !== "open" && (
              <span className="pill bg-mint/15 text-[#067a41]">
                <IconCheck className="size-3.5" />
                {item.status === "contacted" ? "Contacted" : "Flagged"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* The sentence that is the product */}
      <section className="border-b border-stone p-6">
        <p className="eyebrow">Why she is in your queue</p>
        <p className="mt-3 text-subheading text-charcoal">{item.reason}</p>
        <p className="mt-3 text-[13px] text-muted">
          Produced by the {item.source === "sweep" ? "06:00 cohort sweep" : "triage layer, in the same request as her message"}.
        </p>
      </section>

      {/* Evidence */}
      <section className="border-b border-stone p-6">
        <p className="eyebrow">The evidence behind it</p>
        <ul className="mt-3 flex flex-col gap-3">
          {item.evidence.map((evidence, index) => (
            <li key={index} className="flex gap-3 rounded-card bg-sand p-4">
              <span className="mt-0.5 shrink-0 text-muted">
                <EvidenceIcon kind={evidence.kind} className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-charcoal">{evidence.label}</p>
                <p className="mt-1 text-[14px] leading-[1.5] text-brown">{evidence.detail}</p>
                {evidence.at && (
                  <p className="mt-1.5 text-[12px] text-muted">
                    {formatDate(evidence.at)} · {relativeDays(evidence.at)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* WHO schedule */}
      <section className="border-b border-stone p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">WHO eight-contact schedule</p>
          <p className="text-[13px] text-muted">
            {mother.ancContacts.filter((c) => c.status === "completed").length} of 8 completed
          </p>
        </div>
        <ScheduleStrip contacts={mother.ancContacts} gestationalWeek={mother.gestationalWeek} />
      </section>

      {/* Saved questions */}
      {open.length > 0 && (
        <section className="border-b border-stone p-6">
          <p className="eyebrow">Saved for her next contact</p>
          <p className="mt-1 text-[13px] text-muted">
            Questions the corpus did not cover. Nnneva did not answer these.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {open.map((question) => (
              <li key={question.id} className="rounded-card bg-sand px-4 py-3">
                <p className="text-[14px] leading-[1.5] text-charcoal">“{question.text}”</p>
                <p className="mt-1 text-[12px] text-muted">{relativeDays(question.at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Record */}
      <section className="border-b border-stone p-6">
        <p className="eyebrow">Record</p>
        <dl className="mt-2 divide-y divide-stone">
          <Field label="Due date">{formatDate(mother.dueDate)}</Field>
          <Field label="Last inbound message">{relativeDays(mother.lastInboundAt)}</Field>
          <Field label="Phone">{mother.phone}</Field>
          <Field label="Emergency contact">
            {mother.emergencyContact.name} ({mother.emergencyContact.relationship})
            <br />
            <span className="text-muted">{mother.emergencyContact.phone}</span>
          </Field>
          <Field label="Consent to sweep">
            {mother.consent ? (
              <span className="text-[#067a41]">Given</span>
            ) : (
              <span className="text-alert">Not given — excluded</span>
            )}
          </Field>
        </dl>
      </section>

      {/* Actions */}
      <section className="bg-sand p-6">
        <p className="eyebrow">Actions</p>
        <p className="mt-1 text-[13px] leading-[1.45] text-muted">
          Every action here is proposed by the agent and paused at the tool boundary until you confirm it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.tool}
              type="button"
              className={`btn ${action.variant === "ink" ? "btn-ink" : "btn-sand"}`}
              onClick={() => propose(action.tool, action.label, action.reason)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

const CONTACT_STYLE: Record<AncContact["status"], { dot: string; text: string }> = {
  completed: { dot: "bg-mint", text: "text-[#067a41]" },
  missed: { dot: "bg-alert", text: "text-alert" },
  due: { dot: "bg-honey", text: "text-gold" },
  upcoming: { dot: "bg-stone", text: "text-muted" },
};

function ScheduleStrip({
  contacts,
  gestationalWeek,
}: {
  contacts: AncContact[];
  gestationalWeek: number;
}) {
  return (
    <ol className="mt-4 grid grid-cols-8 gap-1.5">
      {contacts.map((contact) => {
        const style = CONTACT_STYLE[contact.status];
        const overdue = contact.status === "missed" ? weeksOverdue(contact, gestationalWeek) : 0;

        return (
          <li key={contact.index} className="flex flex-col items-center gap-1.5">
            <span
              className={`h-1.5 w-full rounded-full ${style.dot}`}
              title={`Contact ${contact.index} · week ${contact.targetWeek} · ${contact.status}${
                overdue ? ` by ${overdue} weeks` : ""
              }`}
            />
            <span className={`text-[11px] font-semibold ${style.text}`}>{contact.targetWeek}</span>
          </li>
        );
      })}
    </ol>
  );
}
