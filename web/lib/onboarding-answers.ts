import type { OnboardingAnswers } from "@/app/actions/app";
import type { Role } from "@/lib/onboarding";

/** What the five screens collect, before it is shaped for the API. */
export type Answers = {
  /** ISO yyyy-mm-dd, straight from the date picker. */
  dueDate: string;
  /** ISO yyyy-mm-dd. The postpartum anchor — a fact, not a prediction. */
  birthDate: string;
  feeding: string;
  /** The handle of the person a supporter is here to help. */
  supportingUsername: string;
  careKind: string;
  careName: string;
  clinician: string;
  helpAreas: string[];
  contactName: string;
  contactRelationship: string;
  contactPhone: string;
  contactEmail: string;
  /** "any" means no window — Nnneva may reach out whenever it needs to. */
  contactWindow: "any" | "at";
  /** HH:MM, used only when contactWindow is "at". */
  contactTime: string;
};

export const EMPTY: Answers = {
  dueDate: "",
  birthDate: "",
  feeding: "",
  supportingUsername: "",
  careKind: "",
  careName: "",
  clinician: "",
  helpAreas: [],
  contactName: "",
  contactRelationship: "",
  contactPhone: "",
  contactEmail: "",
  contactWindow: "at",
  contactTime: "18:00",
};

/** Who a trusted contact tends to be. Chosen, not typed, so the stored value
 *  is one of a known set and the agent can reason about it. */
export const RELATIONSHIPS = [
  "Partner",
  "Husband",
  "Mother",
  "Mother-in-law",
  "Sister",
  "Friend",
  "Doula",
  "Other family",
];

/** The due date as an ISO string, or null while it is still incomplete. */
export function dueDateOf(a: Answers): string | null {
  return a.dueDate || null;
}

/**
 * Weeks completed, the same arithmetic the API uses so the number shown during
 * setup matches the one stored afterwards.
 */
export function weeksFrom(iso: string): number {
  const due = new Date(`${iso}T00:00:00Z`).getTime();
  const today = Date.now();
  const daysToGo = Math.floor((due - today) / 86_400_000);
  return Math.max(0, Math.min(42, 40 - Math.floor(daysToGo / 7)));
}

export function trimesterFor(week: number): string {
  if (week < 13) return "first trimester";
  return week < 28 ? "second trimester" : "third trimester";
}

/** A due date must be real, and within a pregnancy's reach of today. */
export function dueDateProblem(a: Answers): string | null {
  const iso = dueDateOf(a);
  if (!iso) return "Pick your due date.";
  const due = new Date(`${iso}T00:00:00Z`).getTime();
  if (Number.isNaN(due)) return "Pick a real date.";
  const days = Math.floor((due - Date.now()) / 86_400_000);
  if (days > 300) return "That is further off than a pregnancy lasts — check the year.";
  if (days < 0) return "A due date cannot be in the past. Pick a date from today onwards.";
  return null;
}

/**
 * The bounds a due date can sensibly fall between, for the picker itself.
 *
 * The floor is today: a due date in the past is not a due date, and someone
 * whose baby has arrived is not who this product is for yet.
 */
export function dueDateRange(): { min: string; max: string } {
  const iso = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  return { min: iso(0), max: iso(300) };
}

/**
 * The bounds a birth date can fall between: the mirror image of the due date's.
 *
 * The ceiling is today, because a baby cannot be born tomorrow. The floor is
 * two years back — past that this is not a postpartum account any more, and a
 * date that far out is far more likely a mistyped year.
 */
export function birthDateRange(): { min: string; max: string } {
  const iso = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  return { min: iso(-730), max: iso(0) };
}

export function birthDateProblem(a: Answers): string | null {
  if (!a.birthDate) return "Pick the date your baby was born.";
  const born = new Date(`${a.birthDate}T00:00:00Z`).getTime();
  if (Number.isNaN(born)) return "Pick a real date.";
  const days = Math.floor((Date.now() - born) / 86_400_000);
  if (days < 0) return "A date of birth cannot be in the future.";
  if (days > 730) return "That is more than two years ago — check the year.";
  return null;
}

/** How the contact window reads once stored. */
export function contactWindowLabel(a: Answers): string {
  if (a.contactWindow === "any") return "Any time is fine";
  const [h] = a.contactTime.split(":");
  const hour = Number(h);
  const part = hour < 12 ? "Mornings" : hour < 18 ? "Afternoons" : "Evenings";
  return `${part}, from ${a.contactTime}`;
}

/**
 * Shapes the answers for the API, sending only what the role actually asked.
 *
 * A supporter's payload carries no due date, no clinic and no help areas —
 * not blanks for them, but nothing at all. Sending empty strings would make
 * the API unable to tell "left blank" from "never asked", which is exactly
 * the confusion that leads to nagging someone for a field they never saw.
 */
export function toPayload(a: Answers, role: Role): OnboardingAnswers {
  const common = {
    contact_window: contactWindowLabel(a),
  };

  if (role === "supporter") {
    return {
      ...common,
      supporting_username: a.supportingUsername.trim().toLowerCase() || null,
      contact_relationship: a.contactRelationship || "Partner",
    };
  }

  const care = {
    ...common,
    care_location: a.careName.trim() || a.careKind || null,
    clinician: a.clinician.trim() || null,
    help_areas: a.helpAreas,
    contact_name: a.contactName.trim() || null,
    contact_relationship: a.contactRelationship || "Partner",
    contact_phone: a.contactPhone.trim() || null,
    contact_email: a.contactEmail.trim() || null,
    // Sharing tasks is the one permission worth having on by default, because
    // each individual share is still approved separately.
    contact_can_see_shared_tasks: Boolean(a.contactName.trim()),
  };

  if (role === "postpartum") {
    if (!a.birthDate) throw new Error("The date of birth is incomplete");
    return { ...care, birth_date: a.birthDate, feeding: a.feeding || null };
  }

  const due = dueDateOf(a);
  if (!due) throw new Error("The due date is incomplete");
  return { ...care, due_date: due };
}
