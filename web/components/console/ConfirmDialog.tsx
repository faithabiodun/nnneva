"use client";

import { useEffect, useRef } from "react";

import type { PendingAction } from "@/lib/types";

import { IconTriage } from "../ui";

/**
 * The human-in-the-loop pause, made visible.
 *
 * The point this dialog has to make on camera: the agent did not send anything.
 * It proposed, the tool call halted at the boundary, and a named person
 * released it. That guarantee is enforced by Strands
 * InterventionHandler.before_tool_call, not by this component — the UI is only
 * where the pause surfaces.
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
      className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-card bg-white p-8 shadow-[0_0_24px_rgba(0,0,0,0.15)]"
      >
        <div className="flex items-center gap-2 text-ember">
          <IconTriage className="size-4" />
          <p className="eyebrow text-ember">Confirmation required</p>
        </div>

        <h2 id="confirm-title" className="mt-3 text-heading font-display text-ink">
          {action.label}
        </h2>
        <p className="mt-2 text-[15px] leading-[1.5] text-brown">{action.reason}</p>

        <div className="mt-5 card-stone p-4">
          <p className="eyebrow">Exactly what will happen</p>
          <p className="mt-2 text-[15px] leading-[1.5] text-charcoal">{action.preview}</p>
        </div>

        <p className="mt-4 flex items-start gap-2 text-[13px] leading-[1.45] text-muted">
          <span className="badge shrink-0 bg-stone font-mono text-[11px] text-brown">{action.tool}</span>
          <span>
            Paused at <code className="text-charcoal">before_tool_call</code>. Nothing reaches her until you
            confirm, and your confirmation is written to the audit log.
          </span>
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-sand" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className="btn btn-ink" onClick={onConfirm}>
            Confirm and send
          </button>
        </div>
      </div>
    </div>
  );
}
