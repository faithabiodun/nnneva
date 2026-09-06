"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Mark } from "@/components/Brand";
import { useShell, type Shell } from "./ShellContext";
import { NAV } from "./nav";

/**
 * The app shell: a dark sidebar against the warm canvas, with the page title in
 * a sticky header so it stays put while a long list scrolls under it.
 *
 * The sidebar becomes a drawer below lg. It closes on navigation and on Escape,
 * and locks the page behind it while open.
 */
export function AppShell({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shell = useShell();
  const [open, setOpen] = useState(false);

  // Derived rather than reacted to, so the drawer closes in the same commit as
  // the route change instead of a frame later.
  const [route, setRoute] = useState(pathname);
  if (route !== pathname) {
    setRoute(pathname);
    setOpen(false);
  }

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="sticky top-0 hidden h-dvh w-[244px] shrink-0 flex-col bg-ink px-4 py-5.5 lg:flex">
        <SidebarBody pathname={pathname} shell={shell} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/60"
            onClick={() => setOpen(false)}
          />
          <aside className="animate-rise absolute inset-y-0 left-0 flex w-[266px] flex-col bg-ink px-4 py-5.5">
            <SidebarBody pathname={pathname} shell={shell} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-4 bg-canvas/90 px-5 pt-5 pb-4 backdrop-blur-md sm:px-9">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            className="-ml-1 grid size-9 shrink-0 place-items-center rounded-md text-ink lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0">
            {/* Wraps rather than truncates: a cut-off page title is worse than a
                header that grows by one line on a narrow screen. */}
            <h1 className="font-display text-[clamp(20px,2.4vw,26px)] font-semibold tracking-[-0.015em] text-balance">
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 text-caption text-muted-2">{subtitle}</p>}
          </div>

          {/* The week-and-due-date pill is the default: it is the one piece of
              context worth carrying on every screen. A page can replace it. */}
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            {aside ?? <StagePill shell={shell} />}
          </div>
        </div>

        <div className="flex-1 px-5 pb-12 sm:px-9">{children}</div>
      </main>
    </div>
  );
}

function SidebarBody({
  pathname,
  shell,
  onClose,
}: {
  pathname: string;
  shell: Shell;
  onClose?: () => void;
}) {
  const firstInitial = shell.fullName.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-5.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Nnneva home">
          <Mark size={36} />
          <span className="flex flex-col">
            <span className="font-display text-[18px] leading-none font-semibold text-white">
              Nnneva
            </span>
            <span className="mt-0.5 text-[10px] text-green-mid">maternal-care agent</span>
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="ml-auto grid size-8 place-items-center rounded-md text-green-soft"
          >
            <svg viewBox="0 0 20 20" className="size-4.5" fill="none" aria-hidden>
              <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-[3px]" aria-label="Sections">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[14.5px] transition-colors ${
                active ? "bg-white/10 text-white" : "text-green-soft hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-4.5 shrink-0" fill="none" aria-hidden>
                <path
                  d={n.d}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="whitespace-nowrap">{n.label}</span>
              {"badge" in n && shell.pendingApprovals > 0 && (
                <span
                  className="ml-auto grid h-[19px] min-w-[19px] shrink-0 place-items-center rounded-pill bg-pink px-1.5 text-[11px] font-medium text-white"
                  aria-label={`${shell.pendingApprovals} waiting for you`}
                >
                  {shell.pendingApprovals}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="mx-1 my-3 h-px bg-white/10" />
        <Link href="/profile" className="flex items-center gap-2.5 rounded-md p-2 hover:bg-white/5">
          <span className="grid size-8.5 shrink-0 place-items-center rounded-full bg-green font-display text-[15px] font-semibold text-white">
            {firstInitial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-small text-white">{shell.fullName}</span>
            <span className="block text-[11.5px] text-green-mid">
              {shell.gestationalWeek === null
                ? "Setup not finished"
                : `${shell.gestationalWeek} weeks pregnant`}
            </span>
          </span>
        </Link>
      </div>
    </>
  );
}

/** "Week 30 · Due 14 Nov", or nothing at all before setup is finished. */
function StagePill({ shell }: { shell: Shell }) {
  if (shell.gestationalWeek === null || !shell.dueDate) return null;
  const due = new Date(`${shell.dueDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return (
    <span className="pill hidden bg-green-wash text-green sm:inline-flex">
      Week {shell.gestationalWeek} · Due {due}
    </span>
  );
}
