"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Mark } from "@/components/Brand";
import type { PartnerView } from "@/lib/types";

/**
 * What the trusted contact sees.
 *
 * No account, no sidebar, no product tour — someone opening this is doing a
 * favour, probably on a phone, probably once. It shows the conversation, the
 * things they have been asked to do, and nothing else.
 *
 * It posts through this route's own handler rather than a server action,
 * because there is no session here: the token in the URL is the whole
 * authorisation, and it should not be handed to the browser twice.
 */
export function PartnerPortal({ token, view }: { token: string; view: PartnerView }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [thread, setThread] = useState(view.messages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const first = view.mother_name;

  const post = async (path: string, payload?: unknown) => {
    const r = await fetch(`/helping/${token}/api${path}`, {
      method: "POST",
      headers: payload ? { "Content-Type": "application/json" } : {},
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  };

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    setBody("");
    startTransition(async () => {
      try {
        const message = await post("/messages", { body: text });
        setThread((prev) => [...prev, message]);
      } catch {
        setError("That did not send. Please try again.");
      }
    });
  };

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-[680px] items-center gap-2.5 px-5 py-5">
        <Mark size={28} />
        <span className="font-display text-[17px] font-semibold text-ink">Nnneva</span>
        <span className="ml-auto text-caption text-faint">Helping {first}</span>
      </header>

      <div className="mx-auto flex max-w-[680px] flex-col gap-4.5 px-5 pb-12">
        <section className="card p-6">
          <h1 className="font-display text-[22px] leading-tight font-semibold text-ink">
            Hello {view.contact_name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-small text-muted">
            {first} has you down as their {view.relationship.toLowerCase()}. You can message
            them here, and see anything they have asked you to help with. You will not see
            anything else about their pregnancy.
          </p>
        </section>

        {view.can_see_tasks && (
          <section className="card p-5.5">
            <h2 className="card-title mb-3">Asked of you</h2>
            {view.tasks.length === 0 ? (
              <p className="text-caption text-muted">Nothing right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {view.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 rounded-md bg-surface px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-small ${t.done ? "text-faint line-through" : "text-ink"}`}
                      >
                        {t.title}
                      </span>
                      {t.detail && (
                        <span className="mt-0.5 block text-caption text-muted-2">{t.detail}</span>
                      )}
                    </span>
                    {!t.done && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await post(`/tasks/${t.id}/done`);
                            router.refresh();
                          })
                        }
                        className="shrink-0 rounded-md bg-green px-3 py-1.5 text-caption text-white transition-colors hover:bg-green-deep disabled:opacity-60"
                      >
                        Done
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="card flex min-h-[42vh] flex-col p-5.5">
          <h2 className="card-title mb-3">Messages</h2>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {thread.length === 0 ? (
              <p className="my-auto px-6 text-center text-small text-muted">
                Nothing yet. Say hello.
              </p>
            ) : (
              thread.map((m) => (
                <p
                  key={m.id}
                  className={`max-w-[80%] rounded-[14px] px-4 py-2.5 text-small ${
                    m.sender === "contact"
                      ? "self-end rounded-br-sm bg-green text-white"
                      : "self-start rounded-bl-sm bg-surface text-ink-2"
                  }`}
                >
                  {m.body}
                </p>
              ))
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-danger-wash px-3.5 py-2.5 text-caption text-danger">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="mt-4 flex gap-2.5 border-t border-line pt-4"
          >
            <label htmlFor="reply" className="sr-only">
              Message {first}
            </label>
            <input
              id="reply"
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
        </section>

        <p className="px-1 text-caption text-faint">
          This page is private to whoever holds its link. {first} can replace or revoke it
          at any time.
        </p>
      </div>
    </main>
  );
}
