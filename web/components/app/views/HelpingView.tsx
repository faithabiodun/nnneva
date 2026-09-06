"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { completeForMother, replyToMother } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { dueLabel } from "@/lib/format";
import type { ContactMessage, Helping } from "@/lib/types";

/**
 * The other side of the link, for someone who has an account.
 *
 * Deliberately thin. A helper sees the thread and whatever tasks she has
 * actually handed over — no week count, no appointments, nothing about the
 * pregnancy. What they learn is what she chose to type.
 *
 * Someone can be on both sides at once: two friends who are both pregnant help
 * each other. So this is a screen, not an account type, and it is empty for
 * most people.
 */
export function HelpingView({
  people,
  open,
  messages,
}: {
  people: Helping[];
  open: Helping | null;
  messages: ContactMessage[];
}) {
  const router = useRouter();

  return (
    <AppShell
      title={open ? open.mother_name : "Helping"}
      subtitle={
        open
          ? `You are their ${open.relationship.toLowerCase()}`
          : "People who have asked for your help"
      }
    >
      {people.length === 0 ? (
        <section className="card max-w-[560px] p-7">
          <h2 className="font-display text-[20px] text-ink">No one yet</h2>
          <p className="mt-2.5 text-small text-muted">
            When someone adds you as their trusted contact, they appear here. You will
            only ever see what they choose to share.
          </p>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
          <div className="card min-w-0 p-3">
            <ul className="flex flex-col gap-0.5">
              {people.map((p) => (
                <li key={p.contact_id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/helping?c=${p.contact_id}`)}
                    className={`flex w-full items-center gap-2 rounded-md px-3.5 py-2.5 text-left transition-colors ${
                      open?.contact_id === p.contact_id ? "bg-surface" : "hover:bg-surface"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small text-ink">
                        {p.mother_name}
                      </span>
                      <span className="block truncate text-caption text-faint">
                        @{p.mother_username}
                      </span>
                    </span>
                    {p.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-pink px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {p.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {open ? (
            <Thread key={open.contact_id} person={open} messages={messages} />
          ) : (
            <section className="card p-7">
              <p className="text-small text-muted">
                Pick someone to see your conversation and anything they have asked for.
              </p>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Thread({ person, messages }: { person: Helping; messages: ContactMessage[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [thread, setThread] = useState(messages);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length]);

  const first = person.mother_name.split(" ")[0];

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    setBody("");
    startTransition(async () => {
      const message = await replyToMother(person.contact_id, text);
      setThread((prev) => [...prev, message]);
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
      <div className="card flex min-h-[58vh] flex-col p-5.5">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {thread.length === 0 ? (
            <p className="my-auto px-6 text-center text-small text-muted">
              Nothing yet. Say hello to {first}.
            </p>
          ) : (
            thread.map((m) => (
              <p
                key={m.id}
                className={`max-w-[80%] rounded-[14px] px-4 py-2.5 text-small ${
                  // "contact" is this reader, so their own messages sit right.
                  m.sender === "contact"
                    ? "self-end rounded-br-sm bg-green text-white"
                    : "self-start rounded-bl-sm bg-surface text-ink-2"
                }`}
              >
                {m.body}
              </p>
            ))
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-4 flex gap-2.5 border-t border-line pt-4"
        >
          <label htmlFor="helping-message" className="sr-only">
            Message
          </label>
          <input
            id="helping-message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
            placeholder={`Message ${first}`}
            className="min-w-0 flex-1 rounded-md bg-surface px-4 py-3 text-small text-ink outline-none focus:ring-2 focus:ring-green disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-md bg-green px-5 py-3 text-small font-medium text-white transition-colors hover:bg-green-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>

      <section className="card p-5.5">
        <h2 className="card-title mb-3">What {first} asked for</h2>
        {!person.can_see_tasks ? (
          <p className="text-caption text-muted">
            {first} has not shared any tasks with you.
          </p>
        ) : person.tasks.length === 0 ? (
          <p className="text-caption text-muted">Nothing right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {person.tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-md bg-surface px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-small ${t.done ? "text-faint line-through" : "text-ink"}`}
                  >
                    {t.title}
                  </span>
                  {t.due_date && (
                    <span className="mt-0.5 block text-caption text-faint">
                      {dueLabel(t.due_date)}
                    </span>
                  )}
                </span>
                {!t.done && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await completeForMother(person.contact_id, t.id);
                        router.refresh();
                      })
                    }
                    className="shrink-0 rounded-md bg-green px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-green-deep disabled:opacity-60"
                  >
                    Done
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
