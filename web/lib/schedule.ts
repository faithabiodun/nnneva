/**
 * WHO eight-contact antenatal schedule, and the date helpers the console needs.
 *
 * SOURCE: WHO recommendations on antenatal care for a positive pregnancy
 * experience (World Health Organization, 2016) — one contact in the first
 * trimester, two in the second, five in the third.
 */

import type { AncContact, AncStatus } from "./types";

/** Target gestational week for each of the eight contacts. */
export const WHO_CONTACT_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40] as const;

/** A contact is "missed" once this many weeks past its target week have passed. */
const MISSED_AFTER_WEEKS = 2;

/**
 * The demo runs against a fixed clock so the fixtures are deterministic and the
 * video can be re-recorded without the queue changing underneath you.
 * Tuesday 8 September 2026, the morning after the 06:00 sweep.
 */
export const DEMO_NOW = new Date("2026-09-08T07:10:00.000Z");

export function now(): Date {
  return DEMO_NOW;
}

/**
 * Whole calendar days between two instants, in UTC.
 *
 * Deliberately not a 24-hour span: a message sent at 19:41 yesterday is
 * "yesterday" to a health worker reading it at 07:10, not "today", and a
 * message from 28 August is eleven days old on 8 September regardless of the
 * clock time on either end. The queue copy is written in those terms.
 */
export function daysBetween(from: string | Date, to: string | Date = DEMO_NOW): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  const dayA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const dayB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((dayB - dayA) / 86_400_000);
}

/** "11 days ago", "yesterday", "today". */
export function relativeDays(iso: string | null): string {
  if (!iso) return "never";
  const days = daysBetween(iso);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function formatDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

/**
 * Build the eight-contact schedule for a mother at a given gestational week.
 * Contacts before her current week are completed unless listed as missed.
 */
export function buildSchedule(gestationalWeek: number, missedIndexes: number[] = []): AncContact[] {
  return WHO_CONTACT_WEEKS.map((targetWeek, i) => {
    const index = i + 1;
    let status: AncStatus;

    if (missedIndexes.includes(index)) {
      status = "missed";
    } else if (gestationalWeek >= targetWeek + MISSED_AFTER_WEEKS) {
      status = "completed";
    } else if (gestationalWeek >= targetWeek - 1) {
      status = "due";
    } else {
      status = "upcoming";
    }

    const contact: AncContact = { index, targetWeek, status };
    if (status === "completed") {
      // Backdate the completion to roughly its target week.
      const weeksAgo = gestationalWeek - targetWeek;
      const completed = new Date(DEMO_NOW.getTime() - weeksAgo * 7 * 86_400_000);
      contact.completedAt = completed.toISOString();
    }
    return contact;
  });
}

/** How many whole weeks past its target window a missed contact now is. */
export function weeksOverdue(contact: AncContact, gestationalWeek: number): number {
  return Math.max(0, gestationalWeek - contact.targetWeek);
}

export function nextContact(contacts: AncContact[]): AncContact | null {
  return contacts.find((c) => c.status === "due" || c.status === "upcoming") ?? null;
}

export function completedCount(contacts: AncContact[]): number {
  return contacts.filter((c) => c.status === "completed").length;
}
