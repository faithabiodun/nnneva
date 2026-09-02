import type { OnboardingAnswers } from "@/app/actions/app";

/** What the five screens collect, before it is shaped for the API. */
export type Answers = {
  day: string;
  month: string;
  year: string;
  careKind: string;
  careName: string;
  clinician: string;
  helpAreas: string[];
  contactName: string;
  contactRelationship: string;
  contactWindow: string;
};

export const EMPTY: Answers = {
  day: "",
  month: "",
  year: String(new Date().getFullYear()),
  careKind: "",
  careName: "",
  clinician: "",
  helpAreas: [],
  contactName: "",
  contactRelationship: "Partner",
  contactWindow: "Evenings, after 18:00",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The due date as an ISO string, or null while it is still incomplete. */
export function dueDateOf(a: Answers): string | null {
  const monthIndex = MONTHS.indexOf(a.month);
  const day = Number(a.day);
  const year = Number(a.year);
  if (monthIndex < 0 || !day || !year) return null;

  const date = new Date(Date.UTC(year, monthIndex, day));
  // Rejects 31 February and friends, which Date otherwise rolls forward.
  if (date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
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
  if (!iso) return "Enter a real date.";
  const due = new Date(`${iso}T00:00:00Z`).getTime();
  const days = Math.floor((due - Date.now()) / 86_400_000);
  if (days > 300) return "That is further off than a pregnancy lasts — check the year.";
  if (days < -60) return "That date has passed. If your baby has arrived, Nnneva is not the right tool yet.";
  return null;
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
    // Sharing tasks is the one permission worth having on by default, because
    // each individual share is still approved separately.
    contact_can_see_shared_tasks: Boolean(a.contactName.trim()),
    contact_window: a.contactWindow || null,
  };
}
