"use client";

/**
 * Demo state for the two live surfaces.
 *
 * Held in a module-level external store and read through useSyncExternalStore,
 * which is what lets the state live outside React entirely — it is backed by
 * localStorage and kept in step across tabs with a BroadcastChannel. That is
 * what makes the split-screen demo work: put the mother's chat and the health
 * worker console side by side, and a danger sign she sends appears in the queue
 * in the same moment.
 *
 * Server rendering always sees SEED_STATE, so the markup is deterministic;
 * React swaps to the persisted snapshot after hydration.
 *
 * When the Strands backend lands, the action functions become fetch calls and
 * nothing in the components has to change.
 */

import { useSyncExternalStore } from "react";

import { DEMO_MOTHER_ID, SEED_AUDIT, SEED_CHAT, SEED_QUEUE, SEED_SAVED_QUESTIONS, motherById } from "./fixtures";
import { REWRITE_INSTRUCTION, VIOLATION_LABEL, detectDiagnosticLanguage } from "./guardrail";
import { DEMO_NOW } from "./schedule";
import { triage, type TriageResult } from "./triage";
import type { AuditEntry, ChatMessage, PendingAction, QueueItem, SavedQuestion } from "./types";

const STORAGE_KEY = "nnneva:demo:v1";
const CHANNEL = "nnneva:demo";

interface DemoState {
  queue: QueueItem[];
  audit: AuditEntry[];
  chat: ChatMessage[];
  savedQuestions: SavedQuestion[];
}

/** Frozen so it can safely be the server snapshot on every render. */
const SEED_STATE: DemoState = {
  queue: SEED_QUEUE,
  audit: SEED_AUDIT,
  chat: SEED_CHAT,
  savedQuestions: SEED_SAVED_QUESTIONS,
};

/* -------------------------------------------------------------------------- */
/* The external store                                                          */
/* -------------------------------------------------------------------------- */

let state: DemoState = SEED_STATE;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

/** Replace the snapshot. `broadcast` is false when the change came from another tab. */
function commit(next: DemoState, broadcast = true) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private-mode failure. The demo still works from memory.
  }
  if (broadcast) channel?.postMessage(next);
  emit();
}

function update(fn: (prev: DemoState) => DemoState) {
  commit(fn(state));
}

/**
 * Runs once, on the first subscriber — which is after hydration, so reading
 * localStorage here cannot cause a server/client mismatch.
 */
function load() {
  if (loaded) return;
  loaded = true;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) state = JSON.parse(stored) as DemoState;
  } catch {
    // A corrupt store just means we run from the seed.
  }

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<DemoState>) => commit(event.data, false);
  }
}

function subscribe(listener: () => void): () => void {
  load();
  listeners.add(listener);
  if (listeners.size === 1) emit(); // pick up anything load() restored
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => SEED_STATE;

/**
 * The current snapshot, outside React. Used by the tests, and by anything that
 * needs to read state without subscribing to it.
 */
export function getDemoState(): DemoState {
  return state;
}

/* -------------------------------------------------------------------------- */
/* Ids and ordering                                                            */
/* -------------------------------------------------------------------------- */

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Date.now().toString(36)}`;
}

/**
 * New events continue from the demo clock rather than the real date, so the
 * queue stays coherent instead of jumping to today.
 */
function nowIso(): string {
  return new Date(DEMO_NOW.getTime() + counter * 1000).toISOString();
}

const BAND_RANK = { emergency: 0, urgent: 1, routine: 2 } as const;

/** Emergency first, then urgent, then routine; newest first within a band. */
function rank(queue: QueueItem[]): QueueItem[] {
  return [...queue].sort((a, b) => {
    if (a.band !== b.band) return BAND_RANK[a.band] - BAND_RANK[b.band];
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The full inbound path: deterministic triage first, then either a grounded
 * routine answer or fixed escalation text plus a queue item raised in the same
 * pass.
 */
export function sendMotherMessage(text: string): TriageResult {
  const mother = motherById(DEMO_MOTHER_ID);
  const week = mother?.gestationalWeek ?? 33;
  const result = triage(text, week);

  const inbound: ChatMessage = {
    id: nextId("c"),
    role: "mother",
    text,
    at: nowIso(),
    band: result.band,
  };

  update((prev) => {
    const messages: ChatMessage[] = [inbound];
    let queue = prev.queue;
    let audit = prev.audit;
    let savedQuestions = prev.savedQuestions;

    if (result.band !== "routine" && result.sign) {
      // Escalation text is assembled from the corpus, never generated.
      messages.push({
        id: nextId("c"),
        role: "nnneva",
        text: result.sign.escalation,
        at: nowIso(),
        band: result.band,
        fixed: true,
        source: result.sign.source,
      });

      const item: QueueItem = {
        id: nextId("q"),
        motherId: DEMO_MOTHER_ID,
        band: result.band,
        reason: `Reported ${result.sign.label.toLowerCase()} at ${week} weeks just now. Escalation sent automatically; no human has spoken to her yet.`,
        evidence: [
          {
            kind: "triage",
            label: `Danger sign matched: ${result.sign.label.toLowerCase()}`,
            detail: `In window (applies from week ${result.sign.minWeek}; she is at week ${week}). ${result.band} band, escalation text assembled from corpus.`,
            at: inbound.at,
          },
          { kind: "message", label: "Her message", detail: `“${text}”`, at: inbound.at },
        ],
        createdAt: inbound.at,
        source: "triage",
        status: "open",
      };
      queue = rank([item, ...queue]);

      audit = [
        {
          id: nextId("a"),
          at: inbound.at,
          kind: "escalation",
          actor: "agent",
          band: result.band,
          summary: `${mother?.name ?? "Mother"} — ${result.sign.label.toLowerCase()} matched, ${result.band} escalation sent.`,
          detail: `Deterministic triage matched before any model call. Escalation assembled from corpus entry ${result.sign.source.id}. Queue item created in the same request.`,
        },
        ...audit,
      ];
    } else if (result.entry) {
      messages.push({
        id: nextId("c"),
        role: "nnneva",
        text: result.entry.answer,
        at: nowIso(),
        band: "routine",
        source: {
          id: result.entry.id,
          title: result.entry.label,
          citation: result.entry.source.citation,
        },
      });
    } else {
      // Nothing in the corpus covers it, so it is saved rather than improvised.
      messages.push({
        id: nextId("c"),
        role: "nnneva",
        text:
          "I do not have a reliable answer for that, so I am not going to guess. I have saved it as a question for your health worker and she will have it in front of her at your next contact.",
        at: nowIso(),
        band: "routine",
        savedQuestion: true,
      });
      savedQuestions = [
        { id: nextId("sq"), motherId: DEMO_MOTHER_ID, text, at: inbound.at, answered: false },
        ...savedQuestions,
      ];
    }

    return { ...prev, chat: [...prev.chat, ...messages], queue, audit, savedQuestions };
  });

  return result;
}

/**
 * Deliberately runs a model response that names a condition, so the output
 * guardrail can be shown catching it on camera. The only place in the app that
 * fabricates a model turn.
 */
export function tripGuardrail(): void {
  const draft =
    "Looking at the swelling and the headache together, this is probably pre-eclampsia, but it is most likely nothing to worry about at this stage.";
  const violation = detectDiagnosticLanguage(draft);
  if (!violation) return;

  const at = nowIso();
  update((prev) => ({
    ...prev,
    chat: [
      ...prev.chat,
      {
        id: nextId("c"),
        role: "nnneva",
        text:
          "Swelling is something your health worker needs to look at rather than something I can interpret. I have flagged it for her and she will see it in her queue today. If you also have a severe headache or changes in your vision, tell me now and I will treat that differently.",
        at,
        band: "routine",
        fixed: true,
      },
    ],
    audit: [
      {
        id: nextId("a"),
        at,
        kind: "blocked",
        actor: "guardrail",
        band: "routine",
        summary: `Response blocked — ${VIOLATION_LABEL[violation.kind].toLowerCase()}.`,
        detail: `after_model_call caught “${violation.match}”. ${violation.explanation} Returned Guide: “${REWRITE_INSTRUCTION[violation.kind]}” Regenerated response passed and was delivered.`,
      },
      ...prev.audit,
    ],
  }));
}

/** A mother-facing tool call, after the health worker has confirmed it. */
export function confirmAction(action: PendingAction): void {
  const at = nowIso();
  const mother = motherById(action.motherId);

  update((prev) => {
    const status: QueueItem["status"] =
      action.tool === "mark_as_contacted"
        ? "contacted"
        : action.tool === "flag_for_clinical_review"
          ? "flagged"
          : "open";

    const queue = prev.queue.map((item) =>
      item.motherId === action.motherId && item.status === "open" ? { ...item, status } : item,
    );

    const chat =
      action.tool === "send_message" && action.motherId === DEMO_MOTHER_ID
        ? [...prev.chat, { id: nextId("c"), role: "nnneva" as const, text: action.preview, at, fixed: true }]
        : prev.chat;

    return {
      ...prev,
      queue,
      chat,
      audit: [
        {
          id: nextId("a"),
          at,
          kind: "action",
          actor: "chw",
          summary: `Grace Adeniyi confirmed: ${action.label.toLowerCase()} for ${mother?.name ?? action.motherId}.`,
          detail: `Tool ${action.tool} paused at before_tool_call and was released by a named health worker.`,
        },
        ...prev.audit,
      ],
    };
  });
}

export function resetDemo(): void {
  commit(SEED_STATE);
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

export function useDemo() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snapshot, sendMotherMessage, tripGuardrail, confirmAction, resetDemo };
}
