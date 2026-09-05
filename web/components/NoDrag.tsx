"use client";

import { useEffect } from "react";

/**
 * Cancels image drags at the document level.
 *
 * CSS handles selection and the iOS callout, but `user-drag` is not supported
 * in Firefox, so the dragstart event is cancelled here as well. Kept to drags
 * only: blocking the context menu or keyboard shortcuts would take away
 * refresh, back, and open-in-new-tab, which is a real cost for no real gain —
 * anything on screen has already been delivered to the reader's machine.
 */
export function NoDrag() {
  useEffect(() => {
    const cancel = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      // Never interfere with dragging inside a field, which is how people move
      // text around while editing.
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
    };
    document.addEventListener("dragstart", cancel);
    return () => document.removeEventListener("dragstart", cancel);
  }, []);

  return null;
}
