/**
 * Shared shapes for the Nnneva frontend.
 *
 * These mirror what the Strands backend is expected to return, so swapping the
 * fixtures for real API calls should not change any component.
 */

/** The three bands deterministic triage can assign. There is no fourth. */
export type TriageBand = "routine" | "urgent" | "emergency";

/** WHO eight-contact antenatal schedule. */
export type AncStatus = "completed" | "missed" | "due" | "upcoming";

export interface AncContact {
  /** 1-8, position in the WHO model. */
  index: number;
  /** Gestational week the contact is targeted at. */
  targetWeek: number;
  status: AncStatus;
  /** ISO date, present only when status is "completed". */
  completedAt?: string;
}

export interface Mother {
  id: string;
  name: string;
  age: number;
  gestationalWeek: number;
  /** ISO date. */
  dueDate: string;
  phone: string;
  village: string;
  /**
   * Gates whether the sweep may include her at all. A mother without consent
   * is counted in the cohort but never reasoned about.
   */
  consent: boolean;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  ancContacts: AncContact[];
  /** ISO timestamp of her last inbound message, or null if she has never written. */
  lastInboundAt: string | null;
  enrolledAt: string;
}

/** A single piece of evidence behind a queue item. Always shown to the CHW. */
export interface Evidence {
  kind: "schedule" | "message" | "silence" | "flag" | "triage";
  label: string;
  detail: string;
  /** ISO timestamp, where the evidence has a time. */
  at?: string;
}

export interface QueueItem {
  id: string;
  motherId: string;
  band: TriageBand;
  /** One line, plain language, actionable in four seconds without opening a record. */
  reason: string;
  evidence: Evidence[];
  createdAt: string;
  /** "sweep" = produced by the 06:00 autonomous run. "triage" = raised by an inbound message. */
  source: "sweep" | "triage";
  status: "open" | "contacted" | "flagged" | "dismissed";
}

export interface AuditEntry {
  id: string;
  at: string;
  kind: "escalation" | "blocked" | "action" | "sweep";
  actor: "agent" | "chw" | "guardrail";
  summary: string;
  detail?: string;
  band?: TriageBand;
}

/** A citation back into the curated clinical corpus. */
export interface CorpusSource {
  id: string;
  title: string;
  /** Publishing body and year, e.g. "WHO ANC recommendations, 2016". */
  citation: string;
}

export interface ChatMessage {
  id: string;
  role: "mother" | "nnneva";
  text: string;
  at: string;
  /** The band triage assigned to the mother's message that produced this turn. */
  band?: TriageBand;
  /** Which corpus entry grounded the answer. Null means nothing was cited. */
  source?: CorpusSource;
  /**
   * True when the text was assembled from the corpus rather than generated.
   * Every urgent/emergency response is fixed.
   */
  fixed?: boolean;
  /** True when the corpus did not cover the question and it was saved instead. */
  savedQuestion?: boolean;
}

export interface SavedQuestion {
  id: string;
  motherId: string;
  text: string;
  at: string;
  /** Cleared once the CHW covers it at the next contact. */
  answered: boolean;
}

/** What a mother-facing action looks like before a human confirms it. */
export interface PendingAction {
  tool: "send_message" | "flag_for_clinical_review" | "mark_as_contacted";
  motherId: string;
  label: string;
  /** Rendered for review — exactly what will happen if the CHW confirms. */
  preview: string;
  reason: string;
}
