"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import AncStrip from "@/components/console/AncStrip";
import { Card, EmptyState, IconSearch, STATE_STYLE, SectionHead } from "@/components/ui";
import { cohortRows, type CohortState } from "@/lib/cohort";
import { relativeDays } from "@/lib/schedule";
import { useDemo } from "@/lib/store";

const FILTERS: { value: CohortState | "all"; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "urgent", label: "Urgent" },
  { value: "attention", label: "Attention" },
  { value: "onTrack", label: "On track" },
  { value: "excluded", label: "Not consented" },
];

/**
 * The directory. Sorted the way a health worker reads it — urgent first, then
 * whoever has been quiet longest — rather than alphabetically, which would be
 * the obvious choice and the wrong one.
 */
export default function MothersPage() {
  const { queue } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CohortState | "all">("all");

  const rows = cohortRows(queue);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.state !== filter) return false;
      if (!needle) return true;
      return (
        row.mother.name.toLowerCase().includes(needle) ||
        row.mother.village.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, filter]);

  return (
    <div className="mx-auto max-w-(--container-app) px-5 py-8 lg:px-10 lg:py-10">
      <SectionHead
        eyebrow="Enrolled cohort"
        title="Mothers"
        level={1}
        note="Ordered by who needs reading first, not alphabetically: urgent, then awaiting follow-up, then whoever has been silent longest."
      />

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <IconSearch className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-text-3" />
          <label htmlFor="mother-search" className="sr-only">
            Search mothers by name or village
          </label>
          <input
            id="mother-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or village…"
            autoComplete="off"
            className="input pl-11"
          />
        </div>

        <div className="scroll-x flex gap-1 rounded-pill bg-surface-2 p-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-pill px-3.5 py-1.5 text-caption font-semibold whitespace-nowrap transition-colors ${
                filter === option.value ? "bg-aqua text-midnight" : "text-text-2 hover:text-text"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="tnum ml-auto text-caption text-text-3">
          {shown.length} of {rows.length}
        </p>
      </div>

      {shown.length === 0 ? (
        <Card className="mt-6">
          <EmptyState title="No mothers match" body="Try a different name, village, or filter." />
        </Card>
      ) : (
        <ul className="mt-6 grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map(({ mother, state, completed, silentFor }) => (
            <li key={mother.id}>
              <Link
                href={`/mothers/${mother.id}`}
                className="block h-full rounded-card bg-surface p-5 hairline transition-colors hover:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-h3 text-text">{mother.name}</p>
                    <p className="mt-1 text-caption text-text-3">
                      {mother.gestationalWeek} weeks · {mother.village} · {mother.age} years
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 text-caption font-semibold ${STATE_STYLE[state].text}`}
                  >
                    <span className={`size-1.5 rounded-full ${STATE_STYLE[state].dot}`} aria-hidden />
                    {STATE_STYLE[state].label}
                  </span>
                </div>

                <div className="mt-5">
                  <AncStrip
                    contacts={mother.ancContacts}
                    gestationalWeek={mother.gestationalWeek}
                    showLabels={false}
                  />
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-3 text-caption text-text-3">
                  <span className="tnum">contact {completed} of 8</span>
                  <span>
                    {silentFor === null
                      ? "never written"
                      : `last heard ${relativeDays(mother.lastInboundAt)}`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
