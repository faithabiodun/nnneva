"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Card, IconCheck, IconQuestion, IconTriage, MarkLife, SectionHead } from "@/components/ui";
import { DEMO_MOTHER_ID, motherById } from "@/lib/fixtures";
import { formatTime } from "@/lib/schedule";
import { useDemo } from "@/lib/store";
import type { TriageResult } from "@/lib/triage";
import type { ChatMessage } from "@/lib/types";

/**
 * Her conversation, and what the safety layer did with it.
 *
 * On a phone the pearl surface fills the screen and the instrumentation is out
 * of the way below — that is the real product, and it should feel like nothing
 * but a calm messaging app. On a desktop the same surface becomes a card beside
 * the trace, because a judge needs to see both halves at once.
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
  const { chat, savedQuestions, sendMotherMessage, tripGuardrail } = useDemo();
  const [draft, setDraft] = useState("");
  const [lastTriage, setLastTriage] = useState<TriageResult | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const mother = motherById(DEMO_MOTHER_ID)!;
  const herQuestions = savedQuestions.filter((q) => q.motherId === mother.id && !q.answered);

  /**
   * Scroll the message list itself rather than calling scrollIntoView, which
   * walks every scrollable ancestor and on a phone drags the whole document up
   * — taking her header behind the top bar with it.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
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
    <div className="mx-auto grid max-w-(--container-app) grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:px-10 lg:py-10">
      {/* ------------------------------------------------------------------ */}
      {/* Her phone                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="on-pearl flex h-[calc(100dvh-3.5rem)] min-w-0 flex-col overflow-hidden lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-6.5rem)] lg:rounded-[30px]">
        <header className="shrink-0 border-b border-pearl-line px-5 py-4">
          <div className="flex items-center gap-3">
            <MarkLife className="size-7 shrink-0 text-teal" />
            <div className="min-w-0">
              <p className="text-[17px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                Nnneva
              </p>
              <p className="text-caption text-ink-3">Your maternal care companion</p>
            </div>
            <span className="ml-auto shrink-0 rounded-pill bg-softmint px-3 py-1.5 text-caption font-semibold text-good-deep">
              Week {mother.gestationalWeek}
            </span>
          </div>

          {/* Not a footer disclaimer. The product model, where she reads it. */}
          <p className="mt-3.5 rounded-input bg-softmint px-3.5 py-2.5 text-caption leading-relaxed text-good-deep">
            Nnneva informs and coordinates. Your health worker makes clinical decisions.
          </p>
        </header>

        <div ref={listRef} className="scroll-y flex-1 space-y-4 px-5 py-5">
          {chat.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}

          {herQuestions.length > 0 && (
            <div className="rounded-card bg-white px-4 py-3.5 shadow-[var(--shadow-pearl)]">
              <p className="flex items-center gap-2 text-caption font-semibold text-teal">
                <IconQuestion className="size-3.5" />
                {herQuestions.length}{" "}
                {herQuestions.length === 1 ? "question is" : "questions are"} ready for your health
                worker
              </p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {herQuestions.map((question) => (
                  <li key={question.id} className="text-caption leading-relaxed text-ink-2">
                    “{question.text}”
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-caption text-ink-3">
                She will have these in front of her at your next contact.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="shrink-0 border-t border-pearl-line px-5 py-4">
          <div className="flex items-center gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Message Nnneva
            </label>
            <input
              id="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-pill bg-white px-4 py-3 text-[15px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-teal"
            />
            <button type="submit" className="btn btn-ink shrink-0" disabled={!draft.trim()}>
              Send
            </button>
          </div>

          <div className="scroll-x mt-3 flex gap-1.5 pb-1">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                title={prompt.note}
                onClick={() => send(prompt.text)}
                className="shrink-0 rounded-pill bg-white px-3 py-1.5 text-caption font-semibold whitespace-nowrap text-ink-2 transition-colors hover:bg-softmint hover:text-good-deep"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* What the safety layer did                                          */}
      {/* ------------------------------------------------------------------ */}
      <aside className="flex min-w-0 flex-col gap-5 px-5 pb-10 lg:px-0 lg:pb-0">
        <SectionHead
          eyebrow="Safety architecture"
          title="Three layers, in strict order"
          note="The ordering is the design: the model is never the first line of safety, and never the last."
          className="pt-8 lg:pt-0"
        />

        <TriagePanel result={lastTriage} week={mother.gestationalWeek} />

        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">Layer 2 — constrained generation</p>
            <span className="chip bg-surface-2 text-text-3">during</span>
          </div>
          <p className="mt-3 text-small leading-relaxed text-text-2">
            The model only ever operates inside the band triage assigned. In the routine band it may
            explain and organise, grounded in the curated corpus and citing what it drew on. In the
            urgent and emergency bands it does not write the escalation at all — that text is
            assembled from the corpus, because the highest-stakes sentence Nnneva ever says is the
            one it is least willing to let a model improvise.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">Layer 3 — output guardrail</p>
            <span className="chip bg-surface-2 text-text-3">after every model call</span>
          </div>
          <p className="mt-3 text-small leading-relaxed text-text-2">
            A Strands intervention inspects every generated response before it reaches her and blocks
            diagnostic language — a condition named as a conclusion, a probability claim, a dosing
            instruction, or reassurance that a symptom is definitely nothing. A blocked response is
            regenerated with guidance, and the block is written to the audit log.
          </p>
          <button type="button" className="btn btn-quiet mt-5 w-full" onClick={tripGuardrail}>
            Trip the guardrail deliberately
          </button>
          <p className="mt-3 text-caption leading-relaxed text-text-3">
            Sends a draft that names pre-eclampsia as a conclusion and reassures her it is nothing.
            The guardrail catches it, she receives the rewrite, and the blocked draft appears in the
            audit log.
          </p>
        </Card>

        <Card className="p-6">
          <p className="eyebrow">What Nnneva will never do</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Diagnose",
              "Name a condition as a conclusion",
              "Estimate a medical probability",
              "Prescribe or adjust medication",
              "Say a symptom is definitely harmless",
              "Send anything without a human",
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 text-small text-text-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-caption leading-relaxed text-text-3">
            The set of things it is willing to say about a symptom is deliberately small: this is
            common and here is what usually helps; this needs a health worker today; or this needs a
            health worker right now. There is no fourth option.
          </p>
        </Card>

        <Card className="p-6">
          <p className="eyebrow">Try it beside the console</p>
          <p className="mt-3 text-small leading-relaxed text-text-2">
            Open the console in a second window and send an urgent message here. The queue item
            appears there in the same moment — the two surfaces share state, which is what the
            same-request queue insertion looks like from outside.
          </p>
          <a href="/queue" target="_blank" rel="noreferrer" className="btn btn-aqua mt-5 w-full">
            Open the console in a new tab
          </a>
        </Card>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bubbles                                                                     */
/* -------------------------------------------------------------------------- */

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === "mother") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[20px_20px_6px_20px] bg-ink px-4 py-3 text-[15px] leading-relaxed font-medium text-pearl">
          {message.text}
          <p className="mt-1.5 text-caption text-pearl/50">{formatTime(message.at)}</p>
        </div>
      </div>
    );
  }

  const escalation = message.band === "urgent" || message.band === "emergency";

  /* The red-flag experience. Visually distinct without being alarming — a
     bordered card rather than a red fill, because a mother reading this is
     already frightened and the interface should not add to it. */
  if (escalation) {
    return (
      <div className="animate-rise rounded-[20px_20px_20px_6px] bg-white p-4 shadow-[var(--shadow-pearl)] ring-1 ring-red-deep/25">
        <p className="flex items-center gap-2 text-caption font-bold tracking-[0.08em] text-red-deep uppercase">
          <IconTriage className="size-3.5" />
          {message.band === "emergency" ? "Go now" : "Urgent — today"}
        </p>

        <p className="mt-3 text-[15px] leading-relaxed font-medium text-ink">{message.text}</p>

        <p className="mt-3.5 border-t border-pearl-line pt-3 text-caption leading-relaxed text-ink-3">
          Nnneva has not generated a diagnosis. This text is fixed, assembled from reviewed guidance
          rather than written by a model, and a high-priority review has been created for your health
          worker.
        </p>

        {message.source && (
          <p className="mt-2 text-caption text-ink-3">
            Source: {message.source.title} — {message.source.citation}
          </p>
        )}
        <p className="mt-2 text-caption text-ink-3">{formatTime(message.at)}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-[20px_20px_20px_6px] bg-white px-4 py-3 shadow-[var(--shadow-pearl)]">
        <p className="text-[15px] leading-relaxed font-medium text-ink">{message.text}</p>

        {message.fixed && (
          <p className="mt-2.5 flex items-center gap-1.5 text-caption font-semibold text-teal">
            <IconTriage className="size-3.5" />
            Assembled from reviewed guidance — not generated
          </p>
        )}

        {message.savedQuestion && (
          <p className="mt-2.5 flex items-center gap-1.5 text-caption font-semibold text-teal">
            <IconCheck className="size-3.5" />
            Saved as a question for your next contact
          </p>
        )}

        {/* Grounding, shown but never shouted. She gets one quiet line; the
            health worker can inspect the entry itself in the console. */}
        {message.source && (
          <p className="mt-2.5 border-t border-pearl-line pt-2.5 text-caption leading-relaxed text-ink-3">
            Based on Nnneva&rsquo;s reviewed maternal-care guidance
            <br />
            <span className="text-ink-2">{message.source.title}</span> — {message.source.citation}
          </p>
        )}

        <p className="mt-2 text-caption text-ink-3">{formatTime(message.at)}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Triage trace                                                                */
/* -------------------------------------------------------------------------- */

const OUTCOME_STYLE = {
  matched: "bg-red/15 text-red",
  "out-of-window": "bg-surface-2 text-text-3",
  suppressed: "bg-surface-2 text-text-3",
  "no-match": "bg-surface-2 text-text-3",
} as const;

function TriagePanel({ result, week }: { result: TriageResult | null; week: number }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">Layer 1 — deterministic triage</p>
        <span className="chip bg-surface-2 text-text-3">before any model call</span>
      </div>

      <p className="mt-3 text-small leading-relaxed text-text-2">
        Pure Python over a clinician-reviewable corpus. If the model provider is down, rate-limited,
        or having a bad day, escalation still happens — and an internal error returns the urgent
        band rather than the routine one.
      </p>

      {!result ? (
        <p className="well mt-5 p-4 text-caption leading-relaxed text-text-3">
          Send a message on the left to see every rule it considered and the band it assigned.
        </p>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-3">Band assigned</span>
            <span
              className={`pill ${
                result.band === "routine"
                  ? "bg-mint/15 text-mint"
                  : result.band === "urgent"
                    ? "bg-amber text-[#3a2600]"
                    : "bg-red text-[#2a0705]"
              }`}
            >
              {result.band}
            </span>
          </div>

          {result.suppressed && (
            <p className="well mt-3 p-3.5 text-caption leading-relaxed text-text-2">
              A danger word appeared but was read as a question or a negation, so nothing escalated.
              She is asking what to do, not reporting it — and a system that escalates the former is
              training her to ignore the latter.
            </p>
          )}

          <ul className="mt-3 flex flex-col gap-1.5">
            {result.trace.map((line, index) => (
              <li key={index} className="well p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-caption font-semibold text-text">{line.rule}</span>
                  <span className={`chip shrink-0 ${OUTCOME_STYLE[line.outcome]}`}>{line.outcome}</span>
                </div>
                {line.note && <p className="mt-1.5 text-caption text-text-3">{line.note}</p>}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-caption leading-relaxed text-text-3">
            Windows are applied against her gestational week ({week}). Reduced fetal movement is
            meaningless at eight weeks and critical at thirty-four, so a sign outside its window does
            not fire.
          </p>
        </div>
      )}
    </Card>
  );
}
