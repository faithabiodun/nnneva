import Link from "next/link";

import { Mark } from "@/components/Brand";

/**
 * The frame both auth cards sit in: warm surface, the mark centred above, and a
 * single column that never grows past a comfortable reading width.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-2 px-5 py-12 sm:px-8">
      <div className="w-full max-w-[1000px]">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-[11px]"
          aria-label="Nnneva home"
        >
          <Mark size={38} />
          <span className="font-display text-[22px] font-semibold text-ink">Nnneva</span>
        </Link>

        <div className="mx-auto max-w-[460px]">{children}</div>
      </div>
    </main>
  );
}

/** Google's mark, drawn rather than fetched so the card renders offline too. */
export function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px] shrink-0" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.5h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.7 6c4.5-4.2 6.5-10.2 6.5-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.9 2.4-7.9 2.4-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

export function Divider({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className={`h-px flex-1 ${dark ? "bg-white/15" : "bg-surface-3"}`} />
      <span className={`text-[12px] ${dark ? "text-green-ink-mid" : "text-faint"}`}>{label}</span>
      <span className={`h-px flex-1 ${dark ? "bg-white/15" : "bg-surface-3"}`} />
    </div>
  );
}
