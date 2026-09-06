"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  addContact,
  assignTask,
  inviteContact,
  messageContact,
  removeContact,
  revokeInvite,
  unassignTask,
} from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { FindPeople } from "@/components/app/views/FindPeople";
import { RELATIONSHIPS } from "@/lib/onboarding-answers";
import { dueLabel } from "@/lib/format";
import type { ContactMessage, ContactRequests, Task, TrustedContactDetail } from "@/lib/types";

/**
 * Her side of the partner feature: everyone helping her, the thread with
 * whichever one is open, and what she has asked them to do.
 *
 * The agent is deliberately absent. These are conversations between two
 * people; nothing here is sent to a model, and nothing the agent knows leaks
 * into them.
 *
 * A contact arrives one of two ways and the screen has to show both: someone
 * with a Nnneva account who accepted a request signs in as themselves, and
 * someone without one gets a link. The difference shows up as a link panel
 * that only appears for the second kind.
 */
export function PartnerView({
  contacts,
  open,
  messages,
  tasks,
  requests,
}: {
  contacts: TrustedContactDetail[];
  open: TrustedContactDetail | null;
  messages: ContactMessage[];
  tasks: Task[];
  requests: ContactRequests;
}) {
  const router = useRouter();

  return (
    <AppShell
      title={open ? open.name : "Partner"}
      subtitle={open ? statusLine(open) : "The people helping you through this"}
    >
      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <ContactRail contacts={contacts} open={open} />
        {open ? (
          <Thread key={open.id} contact={open} messages={messages} tasks={tasks} router={router} />
        ) : (
          <div className="flex flex-col gap-4.5">
            <FindPeople requests={requests} />
            <AddByHand />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function statusLine(contact: TrustedContactDetail): string {
  if (contact.username) return `${contact.relationship} · @${contact.username}`;
  if (contact.accepted) return `${contact.relationship} · has opened their link`;
  if (contact.invited) return `${contact.relationship} · invited, not opened yet`;
  return `${contact.relationship} · no link yet`;
}

/* ---- Everyone helping ----------------------------------------------------- */

function ContactRail({
  contacts,
  open,
}: {
  contacts: TrustedContactDetail[];
  open: TrustedContactDetail | null;
}) {
  const router = useRouter();
  return (
    <div className="card min-w-0 p-3">
      <button
        type="button"
        onClick={() => router.push("/partner")}
        className={`mb-2 flex w-full items-center gap-2 rounded-md px-3.5 py-2.5 text-caption transition-colors ${
          open ? "text-muted hover:bg-surface hover:text-ink" : "bg-surface text-ink"
        }`}
      >
        <span className="text-[15px] leading-none">+</span> Add someone
      </button>

      {contacts.length === 0 ? (
        <p className="px-3.5 py-3 text-caption text-faint">
          No one yet. A pregnancy is rarely one person&rsquo;s job.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => router.push(`/partner?c=${c.id}`)}
                className={`flex w-full items-center gap-2 rounded-md px-3.5 py-2.5 text-left transition-colors ${
                  open?.id === c.id ? "bg-surface" : "hover:bg-surface"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small text-ink">{c.name}</span>
                  <span className="block truncate text-caption text-faint">
                    {c.username ? `@${c.username}` : c.relationship}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="shrink-0 rounded-full bg-pink px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- Adding someone with no account --------------------------------------- */

function AddByHand() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <section className="card p-5.5">
      <h2 className="card-title mb-1.5">Or add someone without an account</h2>
      <p className="text-caption text-muted">
        They will get a link instead. No sign-up, and they only ever see this
        conversation and the tasks you hand over.
      </p>
      <form
        className="mt-3.5 flex flex-col gap-2.5 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || pending) return;
          startTransition(async () => {
            await addContact({ name: name.trim(), relationship, phone: phone.trim() || null });
            setName("");
            setPhone("");
            router.refresh();
          });
        }}
      >
        <label htmlFor="contact-name" className="sr-only">
          Their name
        </label>
        <input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Their name"
          className="min-w-0 flex-1 rounded-md bg-surface px-4 py-2.5 text-small text-ink outline-none focus:ring-2 focus:ring-green"
        />
        <label htmlFor="contact-relationship" className="sr-only">
          They are my
        </label>
        <select
          id="contact-relationship"
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
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="shrink-0 rounded-md bg-ink px-4 py-2.5 text-small font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add
        </button>
      </form>
    </section>
  );
}

/* ---- One conversation ------------------------------------------------------ */

function Thread({
  contact,
  messages,
  tasks,
  router,
}: {
  contact: TrustedContactDetail;
  messages: ContactMessage[];
  tasks: Task[];
  router: ReturnType<typeof useRouter>;
}) {
  const [body, setBody] = useState("");
  const [thread, setThread] = useState(messages);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length]);

  const first = contact.name.split(" ")[0];
  const link =
    contact.access_token && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${contact.access_token}`
      : null;

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    setBody("");
    startTransition(async () => {
      const message = await messageContact(contact.id, text);
      setThread((prev) => [...prev, message]);
    });
  };

  const assigned = tasks.filter((t) => t.assigned_contact_id === contact.id);
  const unassigned = tasks.filter(
    (t) => !t.assigned_contact_id && t.status !== "Complete",
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
      <div className="card flex min-h-[58vh] flex-col p-5.5">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {thread.length === 0 ? (
            <p className="my-auto px-6 text-center text-small text-muted">
              Nothing yet. Send {first} a message.
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

      <div className="flex flex-col gap-4.5">
        {contact.username ? (
          <section className="card p-5.5">
            <h2 className="card-title mb-2.5">How they reach this</h2>
            <p className="text-caption text-muted">
              {first} has a Nnneva account and signs in to help, so there is no link to
              share or revoke. Removing them below ends it.
            </p>
          </section>
        ) : (
          <LinkPanel
            contact={contact}
            first={first}
            link={link}
            copied={copied}
            setCopied={setCopied}
            pending={pending}
            act={startTransition}
            router={router}
          />
        )}

        <section className="card p-5.5">
          <h2 className="card-title mb-3">Asked of them</h2>
          {assigned.length === 0 ? (
            <p className="text-caption text-muted">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {assigned.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-md bg-surface px-3.5 py-2.5"
                >
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
                    onClick={() =>
                      startTransition(async () => {
                        await unassignTask(t.id);
                        router.refresh();
                      })
                    }
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
                      onClick={() =>
                        startTransition(async () => {
                          await assignTask(contact.id, t.id);
                          router.refresh();
                        })
                      }
                      className="w-full rounded-md px-3.5 py-2 text-left text-caption text-muted-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      + {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!contact.permissions.shared_tasks && (
            <p className="mt-4 text-caption text-faint">
              {first} cannot see these yet — switch on shared tasks in Profile.
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await removeContact(contact.id);
              router.push("/partner");
            })
          }
          className="self-start text-caption text-faint transition-colors hover:text-danger"
        >
          Remove {first}
        </button>
      </div>
    </div>
  );
}

function LinkPanel({
  contact,
  first,
  link,
  copied,
  setCopied,
  pending,
  act,
  router,
}: {
  contact: TrustedContactDetail;
  first: string;
  link: string | null;
  copied: boolean;
  setCopied: (v: boolean) => void;
  pending: boolean;
  act: (fn: () => void) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <section className="card p-5.5">
      <h2 className="card-title mb-2.5">Their link</h2>
      {link ? (
        <>
          <p className="text-caption text-muted">
            Anyone with this link can read your messages and the tasks you assign. Send
            it to {first} and no one else.
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
              disabled={pending}
              onClick={() =>
                act(async () => {
                  await inviteContact(contact.id);
                  router.refresh();
                })
              }
              className="text-caption text-muted transition-colors hover:text-ink"
            >
              Replace link
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                act(async () => {
                  await revokeInvite(contact.id);
                  router.refresh();
                })
              }
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
            Create a link for {first}. They will not need an account, and they only ever
            see this conversation and the tasks you hand over.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              act(async () => {
                await inviteContact(contact.id);
                router.refresh();
              })
            }
            className="btn btn-ink mt-4"
          >
            Create their link
          </button>
        </>
      )}
    </section>
  );
}
