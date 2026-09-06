"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "nnneva_theme";

/** Applies the choice by stamping the root, which the CSS keys off. */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/**
 * Light, dark, or follow the device.
 *
 * "System" is a real third state rather than a starting guess: someone whose
 * phone switches at sunset should get that here too, and collapsing it to
 * whatever the device happened to be at first load would freeze it.
 *
 * The chosen theme is applied before paint by the inline script in the root
 * layout; this only handles changing it afterwards.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") setTheme(stored);
    } catch {
      // Storage blocked; the default is fine.
    }
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    apply(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Not remembering the choice is not worth an error.
    }
  };

  const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light",
      icon: (
        <>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </>
      ),
    },
    {
      value: "system",
      label: "System",
      icon: (
        <>
          <rect x="3" y="4.5" width="18" height="12" rx="1.8" />
          <path d="M8.5 20h7" />
        </>
      ),
    },
    {
      value: "dark",
      label: "Dark",
      icon: <path d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4Z" />,
    },
  ];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-pill bg-surface p-0.5"
      role="radiogroup"
      aria-label="Colour theme"
    >
      {OPTIONS.map((o) => {
        const on = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={`grid size-8 place-items-center rounded-pill transition-colors ${
              on ? "bg-white text-ink shadow-[0_1px_2px_rgba(11,44,34,0.08)]" : "text-muted hover:text-ink"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {o.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
