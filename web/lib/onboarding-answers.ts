import type { OnboardingAnswers } from "@/app/actions/app";

/** What the five screens collect, before it is shaped for the API. */
export type Answers = {
  /** ISO yyyy-mm-dd, straight from the date picker. */
  dueDate: string;
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
  if (days < -60) return "That date has passed. If your baby has arrived, Nnneva is not the right tool yet.";
  return null;
}

/** The bounds a due date can sensibly fall between, for the picker itself. */
export function dueDateRange(): { min: string; max: string } {
  const iso = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  return { min: iso(-60), max: iso(300) };
}

/** How the contact window reads once stored. */
export function contactWindowLabel(a: Answers): string {
  if (a.contactWindow === "any") return "Any time is fine";
  const [h] = a.contactTime.split(":");
  const hour = Number(h);
  const part = hour < 12 ? "Mornings" : hour < 18 ? "Afternoons" : "Evenings";
  return `${part}, from ${a.contactTime}`;
}

export function toPayload(a: Answers): OnboardingAnswers {
  const due = dueDateOf(a);
  if (!due) throw new Error("The due date is incomplete");
  return {
    due_date: due,
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
    contact_window: contactWindowLabel(a),
  };
}
