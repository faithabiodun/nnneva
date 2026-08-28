"use client";

import { useEffect, useRef } from "react";

import { IconTriage } from "@/components/ui";
import type { PendingAction } from "@/lib/types";

/**
 * The human-in-the-loop pause, made visible.
 *
 * The point this has to make on camera: the agent did not send anything. It
 * proposed, the tool call halted at the boundary, and a named person released
 * it. That guarantee is enforced by Strands
 * InterventionHandler.before_tool_call, not by this component — the dialog is
 * only where the pause surfaces. Which is why it shows the tool name and the
 * exact text: a confirmation that hides what it is confirming is not one.
 */
export default function ConfirmDialog({
  action,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Held in a ref so the effect below can run once. The parent passes a fresh
  // arrow function on every render, and re-running the effect would drag focus
  // back to Confirm each time the queue changed underneath the dialog.
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  /**
   * Focus is trapped here, not merely moved here.
   *
   * Without the trap, Tab walks straight out of the dialog and into the console
   * behind the overlay — which on this particular dialog means a keyboard user
   * can leave a pending mother-facing action, activate something they cannot
   * see, and never learn what they released. The confirmation gate is the whole
   * safety claim, so it has to hold for the keyboard too.
   *
   * On close, focus returns to whatever opened it.
   */
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const focusable = () => {
      const root = panelRef.current;
      if (!root) return [] as HTMLElement[];
      return [
        ...root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.getClientRects().length > 0);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? panelRef.current?.contains(active) : false;

      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 grid place-items-center bg-midnight/75 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        className="animate-rise scroll-y max-h-[90dvh] w-full max-w-xl rounded-[30px] bg-surface p-7 shadow-[var(--shadow-float)] sm:p-8"
      >
        <span className="inline-flex items-center gap-2 text-amber">
          <IconTriage className="size-4" />
          <span className="eyebrow text-amber">Your confirmation is required</span>
        </span>

        <h2 id="confirm-title" className="mt-4 text-h2">
          {action.label}
        </h2>
        <p className="mt-3 text-body text-text-2">{action.reason}</p>

        <div className="well mt-6 p-5">
          <p className="eyebrow">Exactly what will happen</p>
          <p className="mt-3 text-body leading-relaxed text-text">{action.preview}</p>
        </div>

        <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-caption leading-relaxed text-text-3">
          <code className="chip bg-surface-2 font-mono text-text-2">{action.tool}</code>
          <span className="min-w-0 flex-1">
            Paused at <code className="text-text-2">before_tool_call</code>. Nothing reaches her until
            you confirm, and your confirmation is written to the audit log under your name.
          </span>
        </p>

        <div className="mt-7 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className="btn btn-aqua" onClick={onConfirm}>
            Confirm and send
          </button>
        </div>
      </div>
    </div>
  );
}
