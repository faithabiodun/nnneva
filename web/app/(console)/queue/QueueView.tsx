"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import ConfirmDialog from "@/components/console/ConfirmDialog";
import QueueCard from "@/components/console/QueueCard";
import ReviewPanel from "@/components/console/ReviewPanel";
import { Card, EmptyState, IconCheck, SectionHead } from "@/components/ui";
import { SWEEP_RAN_AT, motherById } from "@/lib/fixtures";
import { formatTime } from "@/lib/schedule";
import { useDemo } from "@/lib/store";
import type { PendingAction, QueueItem } from "@/lib/types";

type Filter = "open" | "all";

/**
 * The ranked queue and the item under review, side by side.
 *
 * Selection falls through to the top of the queue until the health worker picks
 * something, which is what makes the split-screen demo work: a mother sends a
 * danger sign, her item ranks to the top, and it is already on screen.
 */
export default function QueueView() {
  const params = useSearchParams();
  const { queue, savedQuestions, confirmAction, resetDemo } = useDemo();

  const [filter, setFilter] = useState<Filter>("open");
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const openCount = queue.filter((item) => item.status === "open").length;
  const shown: QueueItem[] = filter === "open" ? queue.filter((i) => i.status === "open") : queue;

  // An explicit click wins; then a ?item= link from the overview; then the top.
  const selectedId = picked ?? params.get("item");
  const selected = useMemo(
    () => shown.find((item) => item.id === selectedId) ?? shown[0] ?? null,
    [shown, selectedId],
  );
  const mother = selected ? motherById(selected.motherId) : undefined;

  return (
    <div className="mx-auto max-w-(--container-app) px-5 py-8 lg:px-10 lg:py-10">
      <SectionHead
        eyebrow={`Ranked by the ${formatTime(SWEEP_RAN_AT)} sweep`}
        title="Review queue"
        level={1}
        note="Emergency first, then urgent, then routine — and within a band, whoever has been waiting longest. Each item carries the agent's reasoning and the raw evidence."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Queue filter"
              className="flex gap-1 rounded-pill bg-surface-2 p-1"
            >
              {(
                [
                  ["open", `Open (${openCount})`],
                  ["all", `Everything (${queue.length})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  type="button"
                  aria-selected={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setPicked(null);
                  }}
                  className={`rounded-pill px-3.5 py-1.5 text-caption font-semibold transition-colors ${
                    filter === value ? "bg-aqua text-midnight" : "text-text-2 hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-ghost" onClick={resetDemo}>
              Reset demo
            </button>
          </div>
        }
      />

      {shown.length === 0 ? (
        <Card className="mt-8">
          <EmptyState
            title="Everyone is accounted for."
            body="Nnneva found no mothers requiring review during the latest sweep. The next one runs at 06:00, and anything a mother reports before then arrives here immediately."
            icon={<IconCheck className="mx-auto size-10 text-mint" />}
          />
        </Card>
      ) : (
        <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
          <ol className="flex flex-col gap-2.5">
            {shown.map((item, index) => (
              <li key={item.id} className="animate-rise">
                <QueueCard
                  item={item}
                  rank={index + 1}
                  selected={item.id === selected?.id}
                  onSelect={setPicked}
                />
              </li>
            ))}
          </ol>

          {selected && mother ? (
            <ReviewPanel
              key={selected.id}
              item={selected}
              mother={mother}
              savedQuestions={savedQuestions}
              onAction={setPending}
            />
          ) : (
            <Card>
              <EmptyState title="Nothing selected" body="Pick a mother from the queue to see why she is there." />
            </Card>
          )}
        </div>
      )}

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
