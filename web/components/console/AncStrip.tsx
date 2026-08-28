import { weeksOverdue } from "@/lib/schedule";
import type { AncContact } from "@/lib/types";

/**
 * One mother's position in the WHO eight-contact schedule.
 *
 * A row of eight segments rather than eight dots — the segment carries the
 * connective sense of a schedule you move along, and a missed contact leaves a
 * visible red gap in a line that is otherwise continuous.
 */

const STATUS_STYLE: Record<AncContact["status"], { bar: string; label: string }> = {
  completed: { bar: "bg-mint", label: "text-mint" },
  missed: { bar: "bg-red", label: "text-red" },
  due: { bar: "bg-amber", label: "text-amber" },
  upcoming: { bar: "bg-surface-3", label: "text-text-3" },
};

const STATUS_WORD: Record<AncContact["status"], string> = {
  completed: "completed",
  missed: "missed",
  due: "due now",
  upcoming: "upcoming",
};

export default function AncStrip({
  contacts,
  gestationalWeek,
  showLabels = true,
}: {
  contacts: AncContact[];
  gestationalWeek: number;
  showLabels?: boolean;
}) {
  return (
    <ol className="flex items-end gap-1.5">
      {contacts.map((contact) => {
        const style = STATUS_STYLE[contact.status];
        const overdue = contact.status === "missed" ? weeksOverdue(contact, gestationalWeek) : 0;

        return (
          <li key={contact.index} className="flex min-w-0 flex-1 flex-col gap-2">
            <span
              className={`h-1.5 w-full rounded-full ${style.bar}`}
              title={`Contact ${contact.index} · week ${contact.targetWeek} · ${STATUS_WORD[contact.status]}${
                overdue ? `, ${overdue} weeks past` : ""
              }`}
            />
            {showLabels && (
              <span className={`tnum text-center text-micro font-semibold tracking-normal ${style.label}`}>
                {contact.targetWeek}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
