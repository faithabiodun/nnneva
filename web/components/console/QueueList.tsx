"use client";

import { motherById } from "@/lib/fixtures";
import { SWEEP_RAN_AT } from "@/lib/fixtures";
import { relativeDays } from "@/lib/schedule";
import type { QueueItem } from "@/lib/types";

import { BAND_STYLE, BandPill, IconCheck } from "../ui";

export default function QueueList({
  items,
  selectedId,
  onSelect,
}: {
  items: QueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card grid place-items-center p-10 text-center">
        <IconCheck className="size-6 text-mint" />
        <p className="mt-3 text-[15px] font-semibold text-charcoal">Queue clear</p>
        <p className="mt-1 text-[14px] text-muted">
          Every mother the sweep flagged has been handled. The next sweep runs at 06:00.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item) => {
        const mother = motherById(item.motherId);
        const selected = item.id === selectedId;
        const isNew = item.source === "triage" && item.createdAt > SWEEP_RAN_AT;

        return (
          <li key={item.id} className={isNew ? "animate-rise" : undefined}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? "true" : undefined}
              className={`relative w-full overflow-hidden rounded-card bg-white p-4 pl-5 text-left transition-shadow ${
                selected ? "shadow-[inset_0_0_0_1.5px_var(--color-ink)]" : "hairline hover:shadow-[inset_0_0_0_1px_var(--color-rule)]"
              }`}
            >
              {/* Band rail — the only place colour runs to the card edge. */}
              <span
                className={`absolute inset-y-0 left-0 w-1 ${BAND_STYLE[item.band].rail}`}
                aria-hidden
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-charcoal">
                    {mother?.name ?? item.motherId}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {mother ? `${mother.gestationalWeek} weeks · ${mother.village}` : "—"}
                  </p>
                </div>
                <BandPill band={item.band} />
              </div>

              <p className="mt-2.5 line-clamp-3 text-[14px] leading-[1.45] text-brown">{item.reason}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                <span className="badge bg-stone text-brown">
                  {item.source === "sweep" ? "From the sweep" : "From triage"}
                </span>
                {isNew && <span className="badge bg-alert/12 text-alert">New</span>}
                {item.status !== "open" && (
                  <span className="badge bg-mint/15 text-[#067a41]">
                    <IconCheck className="size-3" />
                    {item.status === "contacted" ? "Contacted" : "Flagged for review"}
                  </span>
                )}
                <span>{relativeDays(item.createdAt)}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
