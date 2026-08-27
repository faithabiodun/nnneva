"use client";

import { formatDate, formatTime } from "@/lib/schedule";
import type { AuditEntry } from "@/lib/types";

const KIND_STYLE: Record<AuditEntry["kind"], { pill: string; label: string }> = {
  escalation: { pill: "bg-honey text-ink", label: "Escalation" },
  blocked: { pill: "bg-alert text-white", label: "Blocked" },
  action: { pill: "bg-mint/15 text-[#067a41]", label: "Confirmed action" },
  sweep: { pill: "bg-stone text-brown", label: "Sweep" },
};

const ACTOR_LABEL: Record<AuditEntry["actor"], string> = {
  agent: "Agent",
  chw: "Health worker",
  guardrail: "Output guardrail",
};

export default function AuditLog({ entries }: { entries: AuditEntry[] }) {
  return (
    <section>
      <div className="max-w-2xl">
        <h2 className="text-heading font-display text-ink">Audit log</h2>
        <p className="mt-2 text-[15px] leading-[1.5] text-brown">
          Every escalation, every response the guardrail blocked, and every action a human confirmed. Written by
          Strands hooks on <code className="text-charcoal">BeforeToolCallEvent</code> and{" "}
          <code className="text-charcoal">AfterModelCallEvent</code>, with the triage band attached.
        </p>
      </div>

      <ol className="mt-6 flex flex-col gap-2">
        {entries.map((entry) => {
          const style = KIND_STYLE[entry.kind];
          return (
            <li key={entry.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pill ${style.pill}`}>{style.label}</span>
                <span className="badge bg-stone text-brown">{ACTOR_LABEL[entry.actor]}</span>
                {entry.band && <span className="badge bg-sand text-muted">band: {entry.band}</span>}
                <span className="ml-auto text-[13px] text-muted">
                  {formatDate(entry.at)} · {formatTime(entry.at)}
                </span>
              </div>

              <p className="mt-3 text-[15px] font-semibold leading-[1.45] text-charcoal">{entry.summary}</p>
              {entry.detail && (
                <p className="mt-1.5 text-[14px] leading-[1.5] text-brown">{entry.detail}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
