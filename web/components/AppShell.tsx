"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useDemo } from "@/lib/store";

import AgentStatus from "./AgentStatus";
import {
  IconClose,
  IconCohort,
  IconLedger,
  IconMenu,
  IconOverview,
  IconPeople,
  IconQuestion,
  IconQueue,
  Wordmark,
} from "./ui";

/**
 * The health-worker shell.
 *
 * Six primary destinations and two secondary ones. The brief is explicit that
 * the sidebar stays thin, and that nothing appears here for a feature that does
 * not exist — so there is no Settings and no Help, because there is no settings
 * page and no help page. Every row below goes somewhere real.
 *
 * On tablet the rail collapses to icons; on mobile it becomes a drawer, and the
 * review queue keeps the full width.
 */

type NavItem = {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** Reads the live queue for its count. */
  badge?: "queue" | "questions";
};

const PRIMARY: NavItem[] = [
  { href: "/", label: "Overview", Icon: IconOverview },
  { href: "/queue", label: "Review queue", Icon: IconQueue, badge: "queue" },
  { href: "/cohort", label: "Cohort", Icon: IconCohort },
  { href: "/mothers", label: "Mothers", Icon: IconPeople },
  { href: "/questions", label: "Questions", Icon: IconQuestion, badge: "questions" },
  { href: "/audit", label: "Audit log", Icon: IconLedger },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The drawer must not survive a navigation, or the next screen opens behind
  // it. Derived during render rather than in an effect: the close belongs to the
  // same commit as the route change, so the new screen never paints underneath
  // an open drawer. This also covers back-button navigation, which an onClick on
  // each link would miss.
  const [drawerRoute, setDrawerRoute] = useState(pathname);
  if (drawerRoute !== pathname) {
    setDrawerRoute(pathname);
    setOpen(false);
  }

  // Escape closes the drawer, and the page behind it does not scroll while it
  // is open — on a phone that scroll bleed is the difference between a drawer
  // and a broken page.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh">
      {/* ---- Desktop rail ------------------------------------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface/40 lg:flex">
        <RailContents pathname={pathname} />
      </aside>

      {/* ---- Mobile drawer ------------------------------------------------ */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-midnight/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="animate-rise absolute inset-y-0 left-0 flex w-[276px] flex-col border-r border-line-strong bg-canvas"
          >
            <RailContents pathname={pathname} onClose={() => setOpen(false)} autoFocusClose />
          </aside>
        </div>
      )}

      {/* ---- Main --------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-10">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            className="btn btn-ghost -ml-2 px-2 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <IconMenu />
          </button>

          <Link href="/" className="lg:hidden" aria-label="Nnneva overview">
            <Wordmark />
          </Link>

          <p className="ml-auto hidden text-caption text-text-3 sm:block">
            Ogun State PHC · antenatal cohort
          </p>

          <span className="hidden h-5 w-px bg-line-strong sm:block" aria-hidden />

          <span className="flex items-center gap-2.5">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-teal/25 text-caption font-semibold text-mint"
              aria-hidden
            >
              GA
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-caption font-semibold text-text">Grace Adeniyi</span>
              <span className="block text-micro font-medium tracking-normal text-text-3">
                Community health worker
              </span>
            </span>
          </span>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RailContents({
  pathname,
  onClose,
  autoFocusClose = false,
}: {
  pathname: string;
  onClose?: () => void;
  autoFocusClose?: boolean;
}) {
  const { queue, savedQuestions } = useDemo();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Opening the drawer should put the keyboard inside it, not leave focus on
  // the menu button behind the overlay.
  useEffect(() => {
    if (autoFocusClose) closeRef.current?.focus();
  }, [autoFocusClose]);

  const counts = {
    queue: queue.filter((item) => item.status === "open").length,
    questions: savedQuestions.filter((question) => !question.answered).length,
  };

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line px-5">
        <Link href="/" aria-label="Nnneva overview">
          <Wordmark />
        </Link>
        {onClose && (
          <button
            ref={closeRef}
            type="button"
            aria-label="Close navigation"
            className="btn btn-ghost px-2"
            onClick={onClose}
          >
            <IconClose />
          </button>
        )}
      </div>

      <nav className="scroll-y flex-1 px-3 py-5" aria-label="Console">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} count={item.badge ? counts[item.badge] : undefined} />
            </li>
          ))}
        </ul>

        <div className="mt-7 px-3">
          <p className="eyebrow">The other surfaces</p>
        </div>
        <ul className="mt-2 flex flex-col gap-0.5">
          <li>
            <SecondaryLink href="/chat" pathname={pathname} label="Mother's view" note="Her phone" />
          </li>
          <li>
            <SecondaryLink href="/about" pathname={pathname} label="How it works" note="The architecture" />
          </li>
        </ul>
      </nav>

      <div className="shrink-0 p-3">
        <AgentStatus compact />
      </div>
    </>
  );
}

function NavLink({ item, pathname, count }: { item: NavItem; pathname: string; count?: number }) {
  // "/" must match exactly or it lights up on every route.
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const { Icon } = item;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-small font-semibold transition-colors ${
        active ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2 hover:text-text"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-aqua" : "text-text-3"}`} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`tnum chip ${active ? "bg-aqua text-midnight" : "bg-surface-3 text-text-2"}`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function SecondaryLink({
  href,
  pathname,
  label,
  note,
}: {
  href: string;
  pathname: string;
  label: string;
  note: string;
}) {
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-baseline justify-between gap-2 rounded-input px-3 py-2 transition-colors ${
        active ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2 hover:text-text"
      }`}
    >
      <span className="text-small font-semibold">{label}</span>
      <span className="text-micro font-medium tracking-normal text-text-2">{note}</span>
    </Link>
  );
}
