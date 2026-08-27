/**
 * Deterministic danger-sign triage.
 *
 * This layer is deliberately dumb, deliberately auditable, and deliberately
 * FIRST. It runs before any model call. If the model provider is down,
 * rate-limited, or having a bad day, escalation still happens.
 *
 * It fails TOWARDS escalation: an internal error returns the urgent band, not
 * the routine one.
 *
 * Pure functions, no imports beyond the corpus — this file should stay trivial
 * enough that a clinician can read it.
 */

import { DANGER_SIGNS, ROUTINE_CORPUS, type CorpusEntry, type DangerSign } from "./corpus";
import type { TriageBand } from "./types";

export interface TriageResult {
  band: TriageBand;
  /** The danger sign that fired, if any. */
  sign: DangerSign | null;
  /** The routine corpus entry that matched, if any. */
  entry: CorpusEntry | null;
  /** Every rule that was considered, for the on-screen trace. */
  trace: TraceLine[];
  /** True when the message was read as hypothetical or negated. */
  suppressed: boolean;
}

export interface TraceLine {
  rule: string;
  outcome: "matched" | "out-of-window" | "suppressed" | "no-match";
  note?: string;
}

/**
 * Phrases that mean the mother is asking about a sign rather than reporting it.
 * "What should I do if I start bleeding" is not bleeding.
 */
const HYPOTHETICAL = [
  "what should i do if",
  "what do i do if",
  "what if i",
  "if i start",
  "if i get",
  "if i have",
  "in case i",
  "in case of",
  "should i worry if",
  "what happens if",
  "is it normal to have",
  "how do i know if",
  "when should i worry about",
];

/** Phrases that negate a sign appearing later in the same message. */
const NEGATION = [
  "no ",
  "not ",
  "don't have",
  "dont have",
  "do not have",
  "haven't had",
  "havent had",
  "have not had",
  "without any",
  "there is no",
  "i am not",
  "i'm not",
];

/**
 * How far back to look for a negation, in characters.
 *
 * Deliberately short. A wide window catches more negations, but it also starts
 * swallowing real reports — "I am not sure if the baby is moving less" is a
 * report, and a 28-character window reads it as a denial and drops it silently.
 * Missing a negation only costs a false escalation; missing a report can cost
 * more than that. So the window stays tight enough that only an immediately
 * adjacent negation counts.
 */
const NEGATION_WINDOW = 14;

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isHypothetical(text: string): boolean {
  return HYPOTHETICAL.some((phrase) => text.includes(phrase));
}

/** Looks only at the run-up to the trigger, so "no bleeding but I have a fever" still escalates the fever. */
function isNegated(text: string, triggerIndex: number): boolean {
  const before = text.slice(Math.max(0, triggerIndex - NEGATION_WINDOW), triggerIndex);
  return NEGATION.some((phrase) => before.includes(phrase));
}

/** Higher band wins when a message trips more than one sign. */
function outranks(a: TriageBand, b: TriageBand): boolean {
  const rank: Record<TriageBand, number> = { routine: 0, urgent: 1, emergency: 2 };
  return rank[a] > rank[b];
}

/**
 * Triage a single inbound message against the corpus.
 *
 * @param message  Raw text from the mother.
 * @param gestationalWeek  Used to apply each sign's window.
 */
export function triage(message: string, gestationalWeek: number): TriageResult {
  try {
    const text = normalise(message);
    const trace: TraceLine[] = [];
    const hypothetical = isHypothetical(text);

    let band: TriageBand = "routine";
    let sign: DangerSign | null = null;
    let suppressed = false;

    for (const candidate of DANGER_SIGNS) {
      const hitIndex = candidate.triggers
        .map((trigger) => text.indexOf(trigger))
        .filter((index) => index !== -1)
        .sort((a, b) => a - b)[0];

      if (hitIndex === undefined) {
        continue;
      }

      if (hypothetical) {
        trace.push({
          rule: candidate.label,
          outcome: "suppressed",
          note: "read as a hypothetical question, not a report",
        });
        suppressed = true;
        continue;
      }

      if (isNegated(text, hitIndex)) {
        trace.push({
          rule: candidate.label,
          outcome: "suppressed",
          note: "negated in the message",
        });
        suppressed = true;
        continue;
      }

      if (gestationalWeek < candidate.minWeek || gestationalWeek > candidate.maxWeek) {
        trace.push({
          rule: candidate.label,
          outcome: "out-of-window",
          note: `applies from week ${candidate.minWeek}; she is at week ${gestationalWeek}`,
        });
        continue;
      }

      trace.push({
        rule: candidate.label,
        outcome: "matched",
        note: `${candidate.band} band, week ${candidate.minWeek}-${candidate.maxWeek}`,
      });

      if (sign === null || outranks(candidate.band, band)) {
        band = candidate.band;
        sign = candidate;
      }
    }

    // Only look for a routine answer if nothing escalated.
    let entry: CorpusEntry | null = null;
    if (band === "routine") {
      entry =
        ROUTINE_CORPUS.find((candidate) =>
          candidate.triggers.some((trigger) => text.includes(trigger)),
        ) ?? null;

      trace.push({
        rule: "Routine corpus",
        outcome: entry ? "matched" : "no-match",
        note: entry ? entry.label : "no covering entry — will be saved for her next contact",
      });
    }

    return { band, sign, entry, trace, suppressed };
  } catch {
    // Fail towards escalation. Never towards silence.
    return {
      band: "urgent",
      sign: null,
      entry: null,
      trace: [{ rule: "Triage error", outcome: "matched", note: "failed towards escalation" }],
      suppressed: false,
    };
  }
}
