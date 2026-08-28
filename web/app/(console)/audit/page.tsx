"use client";

import { Card, SectionHead } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/schedule";
import { useDemo } from "@/lib/store";
import type { AuditEntry } from "@/lib/types";

const KIND_STYLE: Record<AuditEntry["kind"], { pill: string; label: string; rail: string }> = {
  escalation: { pill: "bg-amber-wash text-amber", label: "Escalation", rail: "bg-amber" },
  blocked: { pill: "bg-red text-[#2a0705]", label: "Response blocked", rail: "bg-red" },
  action: { pill: "bg-mint-wash text-mint", label: "Confirmed action", rail: "bg-mint" },
  sweep: { pill: "bg-surface-3 text-text-2", label: "Cohort sweep", rail: "bg-teal" },
};

const ACTOR_LABEL: Record<AuditEntry["actor"], string> = {
  agent: "Agent",
  chw: "Health worker",
  guardrail: "Output guardrail",
};

/**
 * The audit log, as a product surface rather than a debug view.
 *
 * A programme handling health data about pregnant women needs to be able to
 * answer "what did the system do, and who released it" without reading server
 * logs. So the timestamp is the spine and every entry names its actor.
 */
export default function AuditPage() {
  const { audit } = useDemo();

  const blocked = audit.filter((entry) => entry.kind === "blocked").length;
  const escalations = audit.filter((entry) => entry.kind === "escalation").length;
  const confirmed = audit.filter((entry) => entry.kind === "action").length;

  return (
    <div className="mx-auto max-w-(--container-read) px-5 py-8 lg:px-10 lg:py-10">
      <SectionHead
        eyebrow="Audit log"
        title="Everything the system did, and who released it"
        note={
          <>
            Every escalation, every response the guardrail blocked, and every action a human
            confirmed. Written by Strands hooks on <code className="text-text">BeforeToolCallEvent</code>{" "}
            and <code className="text-text">AfterModelCallEvent</code>, with the triage band attached.
          </>
        }
      />

      <div className="mt-8 grid gap-px overflow-hidden rounded-card bg-line sm:grid-cols-3">
        {[
          ["Escalations", escalations, "text-amber"],
          ["Responses blocked", blocked, "text-red-text"],
          ["Actions confirmed by a human", confirmed, "text-mint"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="bg-surface p-6">
            <p className="eyebrow">{label as string}</p>
            <p className={`tnum mt-3 text-h1 leading-none font-semibold ${tone as string}`}>
              {value as number}
            </p>
          </div>
        ))}
      </div>

      <ol className="mt-8 flex flex-col gap-2.5">
        {audit.map((entry) => {
          const style = KIND_STYLE[entry.kind];
          return (
            <li key={entry.id} className="animate-rise">
              <Card className="relative overflow-hidden p-5 pl-6 lg:p-6 lg:pl-7">
                <span className={`absolute inset-y-4 left-0 w-[3px] rounded-r-full ${style.rail}`} aria-hidden />

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`pill ${style.pill}`}>{style.label}</span>
                  <span className="chip bg-surface-2 text-text-3">{ACTOR_LABEL[entry.actor]}</span>
                  {entry.band && (
                    <span className="chip bg-surface-2 text-text-3">band: {entry.band}</span>
                  )}
                  <time className="ml-auto text-caption text-text-3" dateTime={entry.at}>
                    {formatDate(entry.at)} · {formatTime(entry.at)}
                  </time>
                </div>

                <p className="mt-4 text-lead leading-snug text-text">{entry.summary}</p>
                {entry.detail && (
                  <p className="mt-2.5 text-small leading-relaxed text-text-2">{entry.detail}</p>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
