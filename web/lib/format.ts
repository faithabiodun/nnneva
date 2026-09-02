/** Date and label formatting shared by the app screens. */

const LOCALE = "en-GB";

export function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

export function weekdayShort(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { weekday: "short" });
}

export function dayOfMonth(iso: string): string {
  return String(new Date(iso).getUTCDate());
}

export function monthShort(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { month: "short", timeZone: "UTC" });
}

export function weekdayLong(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { weekday: "long", timeZone: "UTC" });
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * A due date as the task lists show it: "Today", "Tomorrow", or "Wed 9 Sep".
 * Compared in whole days so a time of day cannot shift the label.
 */
export function dueLabel(iso: string | null): string {
  if (!iso) return "No date";
  const due = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `${weekdayShort(iso)} ${dayMonth(iso)}`;
}

/** "Fri 09:30" for an appointment that is close, the date when it is not. */
export function appointmentWhen(iso: string): string {
  return `${weekdayLong(iso)} ${dayMonth(iso)}, ${timeOfDay(iso)}`;
}
