/**
 * Derived views over the cohort.
 *
 * Everything here is computed from the fixtures and the live queue rather than
 * stored, so a number on screen can never disagree with the list beside it. The
 * cohort card claims "34 on track"; that figure is the same array the queue is
 * filtered from, counted a different way.
 *
 * When the Strands backend lands these become the shapes the sweep endpoint
 * returns, and the components do not change.
 */

import { COHORT, motherById } from "./fixtures";
import { DEMO_NOW, WHO_CONTACT_WEEKS, completedCount, daysBetween } from "./schedule";
import type { AncContact, ChatMessage, Mother, QueueItem, SavedQuestion } from "./types";

/* -------------------------------------------------------------------------- */
/* Cohort state                                                               */
/* -------------------------------------------------------------------------- */

/**
 * How a mother stands after the sweep. Derived from the queue, not stored on
 * her record — the sweep's output is the only thing that decides this.
 */
export type CohortState = "urgent" | "attention" | "onTrack" | "excluded";

export interface CohortBand {
  state: CohortState;
  label: string;
  count: number;
  /** Whole percent of the reviewed cohort. Rounded so the three add to 100. */
  percent: number;
}

export interface CohortBreakdown {
  enrolled: number;
  /** Consenting mothers — the only ones the sweep is allowed to reason about. */
  reviewed: number;
  excluded: number;
  bands: CohortBand[];
  urgent: number;
  attention: number;
  onTrack: number;
}

/** Open items only. A mother who has been contacted is no longer waiting. */
function openItems(queue: QueueItem[]): QueueItem[] {
  return queue.filter((item) => item.status === "open");
}

export function stateForMother(motherId: string, queue: QueueItem[]): CohortState {
  const mother = motherById(motherId);
  if (mother && !mother.consent) return "excluded";

  const items = openItems(queue).filter((item) => item.motherId === motherId);
  if (items.some((item) => item.band === "urgent" || item.band === "emergency")) return "urgent";
  if (items.length > 0) return "attention";
  return "onTrack";
}

/**
 * Percentages are rounded so they sum to exactly 100 — the largest band absorbs
 * the rounding error, because a cohort card that reads 99% invites a question
 * about the arithmetic rather than about the mothers.
 */
export function cohortBreakdown(queue: QueueItem[]): CohortBreakdown {
  const consenting = COHORT.filter((mother) => mother.consent);
  const open = openItems(queue);

  const urgentIds = new Set(
    open.filter((item) => item.band === "urgent" || item.band === "emergency").map((i) => i.motherId),
  );
  const attentionIds = new Set(
    open.filter((item) => item.band === "routine" && !urgentIds.has(item.motherId)).map((i) => i.motherId),
  );

  const urgent = consenting.filter((m) => urgentIds.has(m.id)).length;
  const attention = consenting.filter((m) => attentionIds.has(m.id)).length;
  const onTrack = consenting.length - urgent - attention;

  const total = consenting.length || 1;
  const urgentPct = Math.round((urgent / total) * 100);
  const attentionPct = Math.round((attention / total) * 100);

  const bands: CohortBand[] = [
    { state: "onTrack", label: "On track", count: onTrack, percent: 100 - urgentPct - attentionPct },
    { state: "attention", label: "Needs attention", count: attention, percent: attentionPct },
    { state: "urgent", label: "Urgent review", count: urgent, percent: urgentPct },
  ];

  return {
    enrolled: COHORT.length,
    reviewed: consenting.length,
    excluded: COHORT.length - consenting.length,
    bands,
    urgent,
    attention,
    onTrack,
  };
}

/* -------------------------------------------------------------------------- */
/* ANC progression across the cohort                                          */
/* -------------------------------------------------------------------------- */

export interface AncStage {
  /** 1-8. */
  index: number;
  targetWeek: number;
  /** Mothers whose next expected contact is this one. */
  active: number;
  /** Of those, how many have already missed it. */
  missed: number;
}

/**
 * Where the cohort sits against the WHO eight-contact model — how many mothers
 * are working towards each contact, and how many of those have already fallen
 * out of its window.
 */
export function ancProgression(): AncStage[] {
  const stages: AncStage[] = WHO_CONTACT_WEEKS.map((targetWeek, i) => ({
    index: i + 1,
    targetWeek,
    active: 0,
    missed: 0,
  }));

  for (const mother of COHORT) {
    if (!mother.consent) continue;

    // Her current stage is the first contact she has not completed.
    const pending = mother.ancContacts.find((c) => c.status !== "completed");
    if (!pending) continue;

    const stage = stages[pending.index - 1];
    stage.active += 1;
    if (pending.status === "missed") stage.missed += 1;
  }

  return stages;
}

/** Cohort-wide completion rate against the schedule, as a whole percent. */
export function scheduleAdherence(): number {
  const consenting = COHORT.filter((m) => m.consent);
  let expected = 0;
  let completed = 0;

  for (const mother of consenting) {
    for (const contact of mother.ancContacts) {
      if (contact.status === "upcoming") continue;
      expected += 1;
      if (contact.status === "completed") completed += 1;
    }
  }

  return expected === 0 ? 100 : Math.round((completed / expected) * 100);
}

/**
 * The cohort's median gestational week.
 *
 * A median rather than a mean: an enrolment intake skews the mean towards the
 * first trimester and makes the cohort look earlier than it is, and the figure
 * on screen is labelled "median", so it had better be one.
 */
export function medianGestationalWeek(): number {
  const weeks = COHORT.filter((mother) => mother.consent)
    .map((mother) => mother.gestationalWeek)
    .sort((a, b) => a - b);

  if (weeks.length === 0) return 0;

  const middle = Math.floor(weeks.length / 2);
  return weeks.length % 2 === 0
    ? Math.round((weeks[middle - 1] + weeks[middle]) / 2)
    : weeks[middle];
}

/* -------------------------------------------------------------------------- */
/* Directory                                                                  */
/* -------------------------------------------------------------------------- */

export interface CohortRow {
  mother: Mother;
  state: CohortState;
  completed: number;
  /** Days since her last inbound message; null when she has never written. */
  silentFor: number | null;
}

/** Urgent first, then attention, then longest-silent — the CHW's reading order. */
export function cohortRows(queue: QueueItem[]): CohortRow[] {
  const order: Record<CohortState, number> = { urgent: 0, attention: 1, onTrack: 2, excluded: 3 };

  return COHORT.map((mother) => ({
    mother,
    state: stateForMother(mother.id, queue),
    completed: completedCount(mother.ancContacts),
    silentFor: mother.lastInboundAt ? daysBetween(mother.lastInboundAt) : null,
  })).sort((a, b) => {
    if (a.state !== b.state) return order[a.state] - order[b.state];
    // Never-written sorts as maximally silent.
    const aSilent = a.silentFor ?? Number.MAX_SAFE_INTEGER;
    const bSilent = b.silentFor ?? Number.MAX_SAFE_INTEGER;
    return bSilent - aSilent;
  });
}

/* -------------------------------------------------------------------------- */
/* Pregnancy timeline                                                         */
/* -------------------------------------------------------------------------- */

export interface TimelineEvent {
  /** Gestational week the event happened at. */
  week: number;
  kind: "enrolled" | "contact" | "missed" | "question" | "flag" | "message" | "now";
  label: string;
  detail?: string;
  at?: string;
}

/** Gestational week at a past instant, given where she is today. */
function weekAt(iso: string, mother: Mother): number {
  const weeksAgo = Math.floor(daysBetween(iso, DEMO_NOW) / 7);
  return Math.max(0, mother.gestationalWeek - weeksAgo);
}

/**
 * The longitudinal record, in one column.
 *
 * This is the visible half of the memory claim: what she reported in week 18 is
 * still on screen in week 32, without replaying a transcript.
 */
export function pregnancyTimeline(
  mother: Mother,
  queue: QueueItem[],
  savedQuestions: SavedQuestion[],
  chat: ChatMessage[] = [],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      week: weekAt(mother.enrolledAt, mother),
      kind: "enrolled",
      label: "Enrolled in the programme",
      detail: `Consent ${mother.consent ? "given" : "withheld"} at enrolment.`,
      at: mother.enrolledAt,
    },
  ];

  for (const contact of mother.ancContacts) {
    if (contact.status === "completed") {
      events.push({
        week: contact.targetWeek,
        kind: "contact",
        label: `Antenatal contact ${contact.index}`,
        detail: `Week ${contact.targetWeek} of the WHO eight-contact schedule.`,
        at: contact.completedAt,
      });
    } else if (contact.status === "missed") {
      events.push({
        week: contact.targetWeek,
        kind: "missed",
        label: `Contact ${contact.index} missed`,
        detail: `Target was week ${contact.targetWeek}. No visit recorded.`,
      });
    }
  }

  for (const question of savedQuestions.filter((q) => q.motherId === mother.id)) {
    events.push({
      week: weekAt(question.at, mother),
      kind: "question",
      label: "Question saved for her next contact",
      detail: `“${question.text}”`,
      at: question.at,
    });
  }

  for (const item of queue.filter((q) => q.motherId === mother.id)) {
    events.push({
      week: weekAt(item.createdAt, mother),
      kind: "flag",
      label: item.source === "triage" ? "Danger sign triaged" : "Flagged by the cohort sweep",
      detail: item.reason,
      at: item.createdAt,
    });
  }

  for (const message of chat.filter((m) => m.role === "mother")) {
    events.push({
      week: weekAt(message.at, mother),
      kind: "message",
      label: "Message from her",
      detail: `“${message.text}”`,
      at: message.at,
    });
  }

  events.sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    return (a.at ?? "").localeCompare(b.at ?? "");
  });

  events.push({
    week: mother.gestationalWeek,
    kind: "now",
    label: "Today",
    detail: `Week ${mother.gestationalWeek}.`,
  });

  return events;
}

/* -------------------------------------------------------------------------- */
/* Schedule helpers the profile needs                                         */
/* -------------------------------------------------------------------------- */

/** The contact she is working towards — due or missed before upcoming. */
export function currentContact(contacts: AncContact[]): AncContact | null {
  return (
    contacts.find((c) => c.status === "missed") ??
    contacts.find((c) => c.status === "due") ??
    contacts.find((c) => c.status === "upcoming") ??
    null
  );
}
