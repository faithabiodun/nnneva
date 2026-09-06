import Link from "next/link";

import { Mark } from "@/components/Brand";

/**
 * The marketing header. Transparent so the hero photograph runs behind it, and
 * `relative` so it stacks above the hero's two gradient scrims.
 */
export function SiteHeader() {
  return (
    <header className="relative z-40">
      <div className="mx-auto flex max-w-(--container-app) items-center gap-4 px-4 py-[18px] sm:gap-10 sm:px-8">
        <Link href="/" className="flex items-center gap-[11px]" aria-label="Nnneva home">
          <Mark size={40} />
          <span className="flex flex-col">
            <span className="font-display text-[20px] leading-none font-semibold tracking-[-0.01em] text-ink">
              Nnneva
            </span>
            <span className="mt-0.5 hidden text-[10.5px] tracking-[0.02em] whitespace-nowrap text-muted-2 sm:block">
              your maternal-care agent
            </span>
          </span>
        </Link>

        {/* Below 360px the wordmark, Log in and the CTA cannot all fit, and
            the CTA is the one that has to survive — so Log in drops out there
            and returns as soon as there is room. */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3.5">
          <Link
            href="/login"
            className="hidden px-1 py-2.5 text-[14.5px] whitespace-nowrap text-green-ink-deep transition-colors hover:text-ink min-[360px]:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-pill bg-pink px-4 py-2.5 text-[13.5px] font-medium whitespace-nowrap text-white shadow-[0_6px_18px_rgba(214,43,96,0.24)] transition-colors hover:bg-pink-deep sm:px-5 sm:py-[11px] sm:text-[14.5px]"
          >
            Start with Nnneva
          </Link>
        </div>
      </div>
    </header>
  );
}
