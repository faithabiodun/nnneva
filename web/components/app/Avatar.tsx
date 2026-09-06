"use client";

/**
 * Five drawn avatars, plus the initial.
 *
 * Drawn rather than uploaded: no file handling, nothing to moderate, no
 * storage bill, and they render identically everywhere without a round trip.
 * Each is a flat mark in the product's own palette rather than a face, so
 * nobody has to see themselves represented by a stock illustration that looks
 * nothing like them.
 */
export const AVATARS = ["bloom", "moon", "leaf", "wave", "sun"] as const;
export type AvatarKey = (typeof AVATARS)[number];

const ART: Record<AvatarKey, { bg: string; fg: string; path: React.ReactNode }> = {
  bloom: {
    bg: "var(--color-pink-wash)",
    fg: "var(--color-pink)",
    path: (
      <>
        <circle cx="16" cy="10" r="4" />
        <circle cx="22" cy="16" r="4" />
        <circle cx="16" cy="22" r="4" />
        <circle cx="10" cy="16" r="4" />
      </>
    ),
  },
  moon: {
    bg: "var(--color-green-wash)",
    fg: "var(--color-green)",
    path: <path d="M22 18.5A8 8 0 0 1 13.5 10a8.2 8.2 0 1 0 8.5 8.5Z" />,
  },
  leaf: {
    bg: "var(--color-green-tint)",
    fg: "var(--color-green)",
    path: <path d="M9 23c0-7 5-12 14-13 0 9-5 13-11 13H9Zm0 0 6-6" />,
  },
  wave: {
    bg: "var(--color-surface-2)",
    fg: "var(--color-ink-3)",
    path: <path d="M7 13c2.5-3 5-3 7.5 0S20 16 22.5 13M7 20c2.5-3 5-3 7.5 0s5.5 3 8 0" />,
  },
  sun: {
    bg: "var(--color-pink-wash)",
    fg: "var(--color-pink)",
    path: (
      <>
        <circle cx="16" cy="16" r="5" />
        <path d="M16 5v3M16 24v3M5 16h3M24 16h3M8.2 8.2l2.1 2.1M21.7 21.7l2.1 2.1M23.8 8.2l-2.1 2.1M10.3 21.7l-2.1 2.1" />
      </>
    ),
  },
};

export function Avatar({
  avatar,
  name,
  size = 76,
}: {
  avatar: string | null;
  name: string;
  size?: number;
}) {
  const key = (AVATARS as readonly string[]).includes(avatar ?? "")
    ? (avatar as AvatarKey)
    : null;

  if (!key) {
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return (
      <span
        className="grid place-items-center rounded-full bg-green font-display font-semibold text-white"
        style={{ width: size, height: size, fontSize: size * 0.37 }}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  const art = ART[key];
  return (
    <span
      className="grid place-items-center rounded-full"
      style={{ width: size, height: size, background: art.bg }}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke={art.fg}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art.path}
      </svg>
    </span>
  );
}
