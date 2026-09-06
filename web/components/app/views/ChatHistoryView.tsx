"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { askNnneva, deleteConversation } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { PlanTimeline, stepsForRun } from "@/components/app/PlanTimeline";
import type { AgentRun, ConversationDetail, ConversationSummary } from "@/lib/types";

/** "Today", "Yesterday", then the date — the grouping a chat history wants. */
function groupOf(iso: string): string {
  const then = new Date(iso);
  const today = new Date();
  const days = Math.floor(
    (new Date(today.toDateString()).getTime() - new Date(then.toDateString()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  if (days < 30) return "Earlier this month";
  return then.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Chat history: the threads on the left, the open one on the right.
 *
 * This replaces the Memory screen. Memory listed facts the agent had stored,
 * which is a developer's view of the product — what someone actually wants is
 * the conversation those facts came out of, and the ability to pick it back up.
 */
export function ChatHistoryView({
  conversations,
  conversation,
}: {
  conversations: ConversationSummary[];
  conversation?: ConversationDetail;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [runs, setRuns] = useState<AgentRun[]>(conversation?.runs ?? []);
  const [error, setError] = useState<string | null>(null);
  const [thinking, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  // The server is the source of truth: after a navigation the thread it sends
  // replaces whatever this component was holding.
  const [threadId, setThreadId] = useState(conversation?.id);
  if (threadId !== conversation?.id) {
    setThreadId(conversation?.id);
    setRuns(conversation?.runs ?? []);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [runs.length, thinking]);

  const send = () => {
    const text = message.trim();
    if (!text || thinking) return;
    setError(null);
    setMessage("");
    startTransition(async () => {
      try {
        const run = await askNnneva(text, conversation?.id);
        setRuns((prev) => [...prev, run]);
        // A brand-new thread needs its own URL, or a refresh loses it.
        if (!conversation) router.push(`/chats/${run.conversation_id ?? ""}`);
        else router.refresh();
      } catch {
        setError("Nnneva could not answer just now. Please try again.");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteConversation(id);
      if (conversation?.id === id) router.push("/chats");
      else router.refresh();
    });
  };

  // Each thread carries its own date heading, or null when the thread above
  // already carries it. Derived up front rather than tracked while mapping:
  // a variable reassigned mid-render is read back stale on the next one.
  const threads = conversations.map((c, i) => {
    const group = groupOf(c.last_message_at);
    const above = i === 0 ? null : groupOf(conversations[i - 1].last_message_at);
    return { conversation: c, heading: group === above ? null : group };
  });

  return (
    <AppShell
      title={conversation ? conversation.title : "Chat history"}
      subtitle={
        conversation
          ? `${runs.length} message${runs.length === 1 ? "" : "s"}`
          : "Everything you and Nnneva have talked about"
      }
    >
      <div className="grid gap-5 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
        {/* ---- The threads --------------------------------------------- */}
        <div className="card min-w-0 p-3">
          <Link
            href="/chats"
            className="mb-2 flex items-center gap-2 rounded-md bg-surface px-3.5 py-2.5 text-caption text-ink transition-colors hover:bg-surface-2"
          >
            <span className="text-[15px] leading-none">+</span> New chat
          </Link>

          {conversations.length === 0 ? (
            <p className="px-3.5 py-4 text-caption text-faint">
              Nothing yet. Ask Nnneva something and it will appear here.
            </p>
          ) : (
            <ul className="flex max-h-[62vh] flex-col gap-0.5 overflow-y-auto">
              {threads.map(({ conversation: c, heading }) => {
                const open = c.id === conversation?.id;
                return (
                  <li key={c.id}>
                    {heading && (
                      <p className="px-3.5 pt-3 pb-1.5 text-[11px] tracking-[0.08em] text-faint uppercase">
                        {heading}
                      </p>
                    )}
                    <div
                      className={`group flex items-start gap-1 rounded-md transition-colors ${
                        open ? "bg-surface" : "hover:bg-surface"
                      }`}
                    >
                      <Link href={`/chats/${c.id}`} className="min-w-0 flex-1 px-3.5 py-2.5">
                        <span className="block truncate text-small text-ink">{c.title}</span>
                        <span className="mt-0.5 block truncate text-caption text-faint">
                          {c.preview}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        aria-label={`Delete “${c.title}”`}
                        className="mt-2.5 mr-1.5 shrink-0 rounded-md px-1.5 py-1 text-caption text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ---- The open thread ------------------------------------------ */}
        <div className="card flex min-h-[62vh] min-w-0 flex-col p-5.5">
          {runs.length === 0 && !thinking ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="font-display text-[20px] text-ink">Ask Nnneva anything</p>
              <p className="mt-2 max-w-[380px] text-small text-muted">
                Questions get answered. Say “remind me”, “book”, or tell it about an
                appointment and it will do the work instead.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
              {runs.map((run) => (
                <div key={run.id} className="flex flex-col gap-3">
                  <p className="self-end max-w-[80%] rounded-[14px] rounded-br-sm bg-green px-4 py-2.5 text-small text-white">
                    {run.prompt}
                  </p>
                  <div className="max-w-[86%]">
                    <p className="rounded-[14px] rounded-bl-sm bg-surface px-4 py-3 text-body text-ink-2">
                      {run.reply}
                    </p>
                    {/* Only when it actually did something. A question that was
                        answered has no plan, and an empty "Agent plan" heading
                        would imply otherwise. */}
                    {stepsForRun(run).length > 0 && (
                      <div className="mt-3 pl-1">
                        <p className="eyebrow mb-2 text-faint">What Nnneva did</p>
                        <PlanTimeline steps={stepsForRun(run)} />
                      </div>
                    )}
                    <p className="mt-1 text-caption text-faint">
                      {run.engine === "bedrock" ? "Claude via Bedrock" : "Rule-based planner"}
                    </p>
                  </div>
                </div>
              ))}
              {thinking && (
                <p className="text-caption text-muted" role="status">
                  Reading your context…
                </p>
              )}
              <div ref={endRef} />
            </div>
          )}

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
            <label htmlFor="chat-message" className="sr-only">
              Message
            </label>
            <input
              id="chat-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={thinking}
              placeholder={conversation ? "Reply…" : "Ask Nnneva anything"}
              className="min-w-0 flex-1 rounded-md bg-surface px-4 py-3 text-small text-ink outline-none focus:ring-2 focus:ring-green disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={thinking || !message.trim()}
              className="rounded-md bg-green px-5 py-3 text-small font-medium text-white transition-colors hover:bg-green-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {thinking ? "…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
