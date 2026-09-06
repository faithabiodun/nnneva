"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  assignTask,
  inviteContact,
  messageContact,
  revokeInvite,
  unassignTask,
} from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { dueLabel } from "@/lib/format";
import type { ContactMessage, Task, TrustedContactDetail } from "@/lib/types";

/**
 * Her side of the partner feature: the thread, and what she has asked them to
 * do.
 *
 * The agent is deliberately absent. This is a conversation between two people;
 * nothing here is sent to a model, and nothing the agent knows leaks into it.
 */
export function PartnerView({
  contact,
  messages,
  tasks,
}: {
  contact: TrustedContactDetail | null;
  messages: ContactMessage[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [thread, setThread] = useState(messages);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length]);

  if (!contact) {
    return (
      <AppShell title="Partner" subtitle="Someone helping you through this">
        <section className="card max-w-[560px] p-7">
          <h2 className="font-display text-[20px] text-ink">No one added yet</h2>
          <p className="mt-2.5 text-small text-muted">
            A trusted contact can message you here and take on the odd task. They never
            see anything about your pregnancy unless you share it, and every share still
            asks you first.
          </p>
          <Link href="/profile" className="btn btn-ink mt-5 inline-flex">
            Add someone in Profile
          </Link>
        </section>
      </AppShell>
    );
  }

  const link =
    contact.access_token && typeof window !== "undefined"
      ? `${window.location.origin}/helping/${contact.access_token}`
      : null;

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    setBody("");
    startTransition(async () => {
      const message = await messageContact(text);
      setThread((prev) => [...prev, message]);
    });
  };

  const assigned = tasks.filter((t) => t.assigned_contact_id === contact.id);
  const unassigned = tasks.filter(
    (t) => !t.assigned_contact_id && t.status !== "Complete",
  );

  return (
    <AppShell
      title={contact.name}
      subtitle={`${contact.relationship} · ${contact.accepted ? "has opened their link" : contact.invited ? "invited, not opened yet" : "not invited yet"}`}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        {/* ---- The thread ---------------------------------------------- */}
        <div className="card flex min-h-[58vh] flex-col p-5.5">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {thread.length === 0 ? (
              <p className="my-auto px-6 text-center text-small text-muted">
                Nothing yet. Send {contact.name.split(" ")[0]} a message — they will see it
                on their link.
              </p>
            ) : (
              thread.map((m) => (
                <p
                  key={m.id}
                  className={`max-w-[80%] rounded-[14px] px-4 py-2.5 text-small ${
                    m.sender === "user"
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
            <label htmlFor="partner-message" className="sr-only">
              Message
            </label>
            <input
              id="partner-message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={pending}
              placeholder={`Message ${contact.name.split(" ")[0]}`}
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

        {/* ---- The link, and what they have been asked to do ------------ */}
        <div className="flex flex-col gap-4.5">
          <section className="card p-5.5">
            <h2 className="card-title mb-2.5">Their link</h2>
            {link ? (
              <>
                <p className="text-caption text-muted">
                  Anyone with this link can read your messages and the tasks you assign.
                  Send it to {contact.name.split(" ")[0]} and no one else.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-md bg-surface px-3.5 py-2.5 text-caption text-muted-2 outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                    className="shrink-0 rounded-md bg-surface px-3.5 py-2.5 text-caption text-ink transition-colors hover:bg-surface-2"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await inviteContact(); router.refresh(); })}
                    className="text-caption text-muted transition-colors hover:text-ink"
                  >
                    Replace link
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await revokeInvite(); router.refresh(); })}
                    className="text-caption text-faint transition-colors hover:text-danger"
                  >
                    Revoke
                  </button>
                </div>
                <p className="mt-2 text-caption text-faint">
                  Replacing or revoking stops the old link working immediately.
                </p>
              </>
            ) : (
              <>
                <p className="text-caption text-muted">
                  Create a link for {contact.name.split(" ")[0]}. They will not need an
                  account, and they only ever see this conversation and the tasks you
                  hand over.
                </p>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await inviteContact(); router.refresh(); })}
                  className="btn btn-ink mt-4"
                >
                  Create their link
                </button>
              </>
            )}
          </section>

          <section className="card p-5.5">
            <h2 className="card-title mb-3">Asked of them</h2>
            {assigned.length === 0 ? (
              <p className="text-caption text-muted">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {assigned.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 rounded-md bg-surface px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-small text-ink">{t.title}</span>
                      {t.due_date && (
                        <span className="mt-0.5 block text-caption text-faint">
                          {dueLabel(t.due_date)}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => startTransition(async () => { await unassignTask(t.id); router.refresh(); })}
                      className="shrink-0 text-caption text-faint transition-colors hover:text-ink"
                    >
                      Take back
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {unassigned.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-caption text-muted">Ask them to help with</h3>
                <ul className="flex flex-col gap-1.5">
                  {unassigned.slice(0, 6).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await assignTask(t.id); router.refresh(); })}
                        className="w-full rounded-md px-3.5 py-2 text-left text-caption text-muted-2 transition-colors hover:bg-surface hover:text-ink"
                      >
                        + {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
