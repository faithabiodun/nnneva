"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { DEMO_MOTHER_ID, motherById } from "@/lib/fixtures";
import { formatTime } from "@/lib/schedule";
import { useDemo } from "@/lib/store";
import type { TriageResult } from "@/lib/triage";
import type { ChatMessage } from "@/lib/types";

import { BandPill, IconCheck, IconTriage } from "@/components/ui";

/**
 * Prompts that exercise each path through the safety layer. They exist so the
 * demo can be recorded without typing, and so a judge testing the live URL hits
 * the interesting cases rather than having to guess at them.
 */
const PROMPTS: { label: string; text: string; note: string }[] = [
  { label: "Routine", text: "I have heartburn most evenings now", note: "Answered from the corpus" },
  {
    label: "Hypothetical",
    text: "What should I do if I start bleeding?",
    note: "Danger word present, but she is asking — no escalation",
  },
  {
    label: "Urgent",
    text: "The baby is moving less than yesterday",
    note: "In window at 33 weeks — escalates",
  },
  { label: "Emergency", text: "I am bleeding and it will not stop", note: "Escalates immediately" },
  {
    label: "Not covered",
    text: "Can I travel to my mother's village next month?",
    note: "Saved for her next contact rather than guessed at",
  },
];

export default function ChatPage() {
  const { chat, sendMotherMessage, tripGuardrail } = useDemo();
  const [draft, setDraft] = useState("");
  const [lastTriage, setLastTriage] = useState<TriageResult | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const mother = motherById(DEMO_MOTHER_ID)!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLastTriage(sendMotherMessage(trimmed));
    setDraft("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  return (
    <div className="mx-auto max-w-(--container-page) px-5 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ------------------------------------------------------------- */}
        {/* Her conversation                                              */}
        {/* ------------------------------------------------------------- */}
        <section className="card flex min-h-[70vh] flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-stone px-6 py-4">
            <div>
              <h1 className="text-[17px] font-semibold text-charcoal">{mother.name}</h1>
              <p className="text-[13px] text-muted">
                {mother.gestationalWeek} weeks · {mother.village} · her phone
              </p>
            </div>
            <span className="badge bg-stone text-brown">Enrolled cohort</span>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {chat.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-stone p-4">
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Message Nnneva
              </label>
              <input
                id="chat-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a message…"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-btn bg-sand px-4 py-2.5 text-[15px] text-charcoal placeholder:text-muted hairline focus:outline-none focus-visible:outline-2 focus-visible:outline-link"
              />
              <button type="submit" className="btn btn-ink" disabled={!draft.trim()}>
                Send
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  title={prompt.note}
                  onClick={() => send(prompt.text)}
                  className="badge bg-sand text-brown transition-colors hover:bg-stone"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </form>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* What the safety layer did                                     */}
        {/* ------------------------------------------------------------- */}
        <aside className="flex flex-col gap-4">
          <TriagePanel result={lastTriage} week={mother.gestationalWeek} />

          <div className="card p-5">
            <p className="eyebrow">Layer 3 — output guardrail</p>
            <p className="mt-2 text-[14px] leading-[1.5] text-brown">
              Runs after every model call and blocks diagnostic language. Trip it deliberately to see it catch a
              response before she does.
            </p>
            <button type="button" className="btn btn-sand mt-4 w-full" onClick={tripGuardrail}>
              Trip the guardrail
            </button>
            <p className="mt-2.5 text-[12px] leading-[1.4] text-muted">
              The blocked draft and the rewrite instruction are written to the audit log in the console.
            </p>
          </div>

          <div className="card-dark p-5">
            <p className="eyebrow text-white/50">Open in a second window</p>
            <p className="mt-2 text-[14px] leading-[1.5] text-white/80">
              Put the console beside this and send an urgent message. The queue item appears there in the same
              moment — the two tabs share state.
            </p>
            <a href="/console" target="_blank" rel="noreferrer" className="btn btn-sand mt-4 w-full">
              Open the console
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Bubble({ message }: { message: ChatMessage }) {
  const fromMother = message.role === "mother";

  if (fromMother) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[18px_18px_4px_18px] bg-ink px-4 py-2.5 text-[15px] leading-[1.5] text-white">
          {message.text}
          <p className="mt-1 text-[11px] text-white/45">{formatTime(message.at)}</p>
        </div>
      </div>
    );
  }

  const escalation = message.band === "urgent" || message.band === "emergency";

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[88%] rounded-[18px_18px_18px_4px] px-4 py-3 ${
          escalation ? "bg-alert/6 shadow-[inset_0_0_0_1px_var(--color-alert)]" : "bg-sand hairline"
        }`}
      >
        {escalation && message.band && (
          <div className="mb-2">
            <BandPill band={message.band} />
          </div>
        )}

        <p className="text-[15px] leading-[1.55] text-charcoal">{message.text}</p>

        {message.fixed && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-ember">
            <IconTriage className="size-3.5" />
            Assembled from the corpus — not generated
          </p>
        )}

        {message.savedQuestion && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-gold">
            <IconCheck className="size-3.5" />
            Saved for her next contact
          </p>
        )}

        {message.source && (
          <p className="mt-2 text-[12px] leading-[1.4] text-muted">
            Source: {message.source.title} — {message.source.citation}
          </p>
        )}

        <p className="mt-1.5 text-[11px] text-muted">{formatTime(message.at)}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const OUTCOME_STYLE = {
  matched: "bg-alert/10 text-alert",
  "out-of-window": "bg-sand text-muted",
  suppressed: "bg-sand text-muted",
  "no-match": "bg-sand text-muted",
} as const;

function TriagePanel({ result, week }: { result: TriageResult | null; week: number }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">Layer 1 — deterministic triage</p>
      <p className="mt-2 text-[14px] leading-[1.5] text-brown">
        Pure Python over a reviewed corpus, running <strong className="text-charcoal">before</strong> any model
        call. If the model provider is down, this still escalates.
      </p>

      {!result ? (
        <p className="mt-4 rounded-card bg-sand p-4 text-[13px] leading-[1.5] text-muted">
          Send a message to see the rules it considered and the band it assigned.
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-muted">Band assigned</span>
            <BandPill band={result.band} />
          </div>

          {result.suppressed && (
            <p className="mt-3 rounded-card bg-sand p-3 text-[13px] leading-[1.45] text-brown">
              A danger word appeared but was read as a question or a negation, so nothing escalated. She is asking
              what to do, not reporting it.
            </p>
          )}

          <ul className="mt-3 flex flex-col gap-1.5">
            {result.trace.map((line, index) => (
              <li key={index} className="rounded-card bg-sand p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-charcoal">{line.rule}</span>
                  <span className={`badge shrink-0 ${OUTCOME_STYLE[line.outcome]}`}>{line.outcome}</span>
                </div>
                {line.note && <p className="mt-1 text-[12px] leading-[1.4] text-muted">{line.note}</p>}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[12px] leading-[1.4] text-muted">
            Windows are applied against her gestational week ({week}). A sign outside its window does not fire.
          </p>
        </div>
      )}
    </div>
  );
}
