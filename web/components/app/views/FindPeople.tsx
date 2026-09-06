"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { answerRequest, searchPeople, sendRequest, withdrawRequest } from "@/app/actions/app";
import { RELATIONSHIPS } from "@/lib/onboarding-answers";
import type { ContactRequests, Person } from "@/lib/types";

/**
 * Finding someone by their handle, and the requests either way.
 *
 * Search is by handle only, and only as a prefix. That is not a limitation
 * dressed up as a feature: a box that matched anywhere in a name would let
 * anyone walk the user list, and confirming that a person uses a maternity app
 * is exactly the thing this product should not do.
 */
export function FindPeople({ requests }: { requests: ContactRequests }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const look = (value: string) => {
    setQuery(value);
    setError(null);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      try {
        setResults(await searchPeople(value));
      } catch {
        setError("Could not search just now.");
      }
    });
  };

  const ask = (username: string) =>
    startTransition(async () => {
      try {
        await sendRequest(username, relationship);
        setResults((prev) =>
          (prev ?? []).map((p) =>
            p.username === username ? { ...p, state: "pending_outgoing" } : p,
          ),
        );
        router.refresh();
      } catch {
        setError("That request could not be sent.");
      }
    });

  const answer = (id: string, accept: boolean) =>
    startTransition(async () => {
      await answerRequest(id, accept);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4.5">
      <section className="card p-5.5">
        <h2 className="card-title mb-1.5">Find someone</h2>
        <p className="text-caption text-muted">
          Search by their Nnneva username. They choose whether to accept, and accepting
          shows them nothing until you switch something on.
        </p>

        <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="people-search" className="sr-only">
            Username
          </label>
          <input
            id="people-search"
            value={query}
            onChange={(e) => look(e.target.value)}
            placeholder="username"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md bg-surface px-4 py-2.5 text-small text-ink outline-none focus:ring-2 focus:ring-green"
          />
          <label htmlFor="people-relationship" className="sr-only">
            They are my
          </label>
          <select
            id="people-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="rounded-md bg-surface px-3.5 py-2.5 text-small text-ink outline-none focus:ring-2 focus:ring-green"
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mt-2.5 text-caption text-danger">{error}</p>}

        {results !== null && (
          <ul className="mt-3.5 flex flex-col gap-1.5">
            {results.length === 0 ? (
              <li className="px-1 py-2 text-caption text-faint">
                No one with that username.
              </li>
            ) : (
              results.map((p) => (
                <li
                  key={p.username}
                  className="flex items-center gap-3 rounded-md bg-surface px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small text-ink">{p.full_name}</span>
                    <span className="block truncate text-caption text-faint">
                      @{p.username}
                    </span>
                  </span>
                  {p.state === "none" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => ask(p.username)}
                      className="shrink-0 rounded-md bg-green px-3.5 py-1.5 text-caption font-medium text-white transition-colors hover:bg-green-deep disabled:opacity-60"
                    >
                      Ask them
                    </button>
                  ) : (
                    <span className="shrink-0 text-caption text-faint">
                      {p.state === "connected"
                        ? "Already helping"
                        : p.state === "pending_outgoing"
                          ? "Asked"
                          : "They asked you"}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {requests.incoming.length > 0 && (
        <section className="card p-5.5">
          <h2 className="card-title mb-1.5">Asking for your help</h2>
          <p className="text-caption text-muted">
            Accepting lets them message you. They see nothing else until they choose to
            share it.
          </p>
          <ul className="mt-3.5 flex flex-col gap-2">
            {requests.incoming.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2.5 rounded-md bg-surface px-3.5 py-3 sm:flex-row sm:items-center"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small text-ink">{r.full_name}</span>
                  <span className="block truncate text-caption text-faint">
                    @{r.username} · as their {r.relationship.toLowerCase()}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => answer(r.id, true)}
                    className="rounded-md bg-green px-3.5 py-1.5 text-caption font-medium text-white transition-colors hover:bg-green-deep disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => answer(r.id, false)}
                    className="rounded-md px-3 py-1.5 text-caption text-muted transition-colors hover:text-ink disabled:opacity-60"
                  >
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests.outgoing.length > 0 && (
        <section className="card p-5.5">
          <h2 className="card-title mb-3">Waiting on a reply</h2>
          <ul className="flex flex-col gap-1.5">
            {requests.outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-1 py-1.5">
                <span className="min-w-0 flex-1 truncate text-small text-muted-2">
                  {r.full_name} <span className="text-faint">@{r.username}</span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await withdrawRequest(r.id);
                      router.refresh();
                    })
                  }
                  className="shrink-0 text-caption text-faint transition-colors hover:text-danger disabled:opacity-60"
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
