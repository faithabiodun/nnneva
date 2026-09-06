"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { forgetMemory } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import type { MemoryItem, MemoryKind } from "@/lib/types";

const ORDER: MemoryKind[] = ["Pregnancy context", "Preferences", "Decisions"];

export function MemoryView({ memories }: { memories: MemoryItem[] }) {
  const [forgotten, setForgotten] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const remaining = memories.filter((m) => !forgotten.includes(m.id));

  const groups = useMemo(
    () =>
      ORDER.map((kind) => ({
        kind,
        items: remaining.filter((m) => m.kind === kind),
      })).filter((g) => g.items.length > 0),
    [remaining],
  );

  const forget = (id: string) => {
    setForgotten((prev) => [...prev, id]);
    startTransition(async () => {
      await forgetMemory(id);
    });
  };

  return (
    <AppShell title="Memory" subtitle="What Nnneva remembers about you">
      <div className="max-w-[1080px]">
        {/* The count comes first because the honest answer to "what does it know
            about me" is a number, not a category list. */}
        <section className="flex flex-wrap items-center gap-4.5 rounded-lg bg-ink px-6.5 py-5.5">
          <div className="min-w-0">
            <p className="text-[16px] text-white">
              {remaining.length === 0
                ? "Nnneva remembers nothing about your pregnancy yet."
                : `Nnneva remembers ${remaining.length} thing${
                    remaining.length === 1 ? "" : "s"
                  } about your pregnancy.`}
            </p>
            <p className="mt-1.5 text-small text-green-ink-soft">
              Nothing here is shared. Remove anything you would rather it forgot.
            </p>
          </div>
        </section>

        {groups.length === 0 ? (
          <p className="card mt-5 p-8 text-center text-body text-muted">
            Memory fills up as you use Nnneva.{" "}
            <Link href="/agent" className="font-medium text-pink-ink hover:underline">
              Tell it something
            </Link>{" "}
            and it will keep what matters.
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-6">
            {groups.map((group) => (
              <section key={group.kind}>
                <h2 className="mb-3 flex items-baseline gap-2.5 font-sans">
                  <span className="eyebrow text-faint">{group.kind}</span>
                  <span className="text-caption text-faint">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <ul className="grid gap-3.5 sm:grid-cols-2">
                  {group.items.map((m) => (
                    <li key={m.id} className="card p-5">
                      <p className="text-body leading-[1.5] text-ink">{m.fact}</p>
                      <p className="mt-3 flex items-center gap-2.5">
                        <span className="min-w-0 text-caption text-faint">{m.source}</span>
                        <button
                          type="button"
                          onClick={() => forget(m.id)}
                          className="ml-auto shrink-0 text-caption font-medium text-pink-ink hover:underline"
                        >
                          Forget
                        </button>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
