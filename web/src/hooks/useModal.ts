import { useEffect, useRef, type MouseEvent } from 'react';

/**
 * The behaviour every dialog is expected to have, in one place.
 *
 * All five panels shared the same overlay markup and the same gaps: Escape did
 * nothing, the backdrop was inert, the page kept scrolling underneath, and Tab
 * walked straight out of the panel into the page behind it. Rather than repeat
 * the same twenty lines five times, each modal calls this and spreads what it
 * returns.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModal(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Held in a ref so the effect can depend on `isOpen` alone. Callers pass a
  // fresh arrow function every render, and re-running the effect would drag
  // focus back to the top of the panel on each parent update.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const opener = document.activeElement as HTMLElement | null;

    const focusables = () => {
      const root = panelRef.current;
      if (!root) return [] as HTMLElement[];
      return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );
    };

    // Move focus into the panel, so the keyboard starts where the eye does.
    (focusables()[0] ?? panelRef.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
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

    document.addEventListener('keydown', onKey);

    // Stop the page scrolling behind the panel.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      // Send focus back to whatever opened this.
      opener?.focus?.();
    };
  }, [isOpen]);

  /**
   * Closes only when the press starts and ends on the backdrop itself.
   *
   * mousedown rather than click, and an explicit target check, so that
   * selecting text inside the panel and releasing the mouse over the backdrop
   * does not dismiss the thing you were reading.
   */
  const onBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCloseRef.current();
  };

  return { panelRef, onBackdropMouseDown };
}
