"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Wordmark } from "./ui";

const LINKS = [
  { href: "/console", label: "Console" },
  { href: "/chat", label: "Mother's view" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-stone bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-(--container-page) items-center justify-between gap-4 px-5">
        <Link href="/" className="rounded-badge" aria-label="Nnneva home">
          <Wordmark />
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-btn px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
                  active ? "bg-ink text-white" : "text-brown hover:bg-stone"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
