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

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

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
