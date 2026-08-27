"use client";

import { useMemo, useState } from "react";

import AuditLog from "@/components/console/AuditLog";
import ConfirmDialog from "@/components/console/ConfirmDialog";
import MotherPanel from "@/components/console/MotherPanel";
import QueueList from "@/components/console/QueueList";
import SweepHeader from "@/components/console/SweepHeader";
import { motherById } from "@/lib/fixtures";
import { useDemo } from "@/lib/store";
import type { PendingAction } from "@/lib/types";

type Tab = "queue" | "audit";

export default function ConsolePage() {
  const { queue, audit, savedQuestions, confirmAction, resetDemo } = useDemo();
  const [tab, setTab] = useState<Tab>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const openCount = queue.filter((item) => item.status === "open").length;

  // Selection falls through to the top of the queue until the user picks one,
  // so a newly escalated mother is on screen the moment she arrives.
  const selected = useMemo(
    () => queue.find((item) => item.id === selectedId) ?? queue[0] ?? null,
    [queue, selectedId],
  );
  const mother = selected ? motherById(selected.motherId) : undefined;

  return (
    <>
      <SweepHeader needsYou={openCount} />

      <div className="mx-auto max-w-(--container-page) px-5 py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Console views" className="flex gap-1 rounded-btn bg-stone p-1">
            {(
              [
                ["queue", `Review queue (${openCount})`],
                ["audit", "Audit log"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-btn px-4 py-1.5 text-[14px] font-semibold transition-colors ${
                  tab === value ? "bg-white text-ink shadow-[var(--shadow-hair)]" : "text-brown hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-ghost text-[13px]" onClick={resetDemo}>
            Reset demo state
          </button>
        </div>

        {tab === "queue" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
            <div>
              <p className="eyebrow mb-3">Ranked for you</p>
              <QueueList items={queue} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
            </div>

            {selected && mother ? (
              <MotherPanel
                item={selected}
                mother={mother}
                savedQuestions={savedQuestions}
                onAction={setPending}
              />
            ) : (
              <div className="card grid place-items-center p-12 text-center">
                <p className="text-[15px] font-semibold text-charcoal">Nothing selected</p>
                <p className="mt-1 text-[14px] text-muted">
                  The queue is empty. The next sweep runs at 06:00.
                </p>
              </div>
            )}
          </div>
        ) : (
          <AuditLog entries={audit} />
        )}
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
    </>
  );
}
