import Image from "next/image";

import logo from "@/public/nnneva-logo.png";

/**
 * The supplied logo, used as the artwork rather than redrawn.
 *
 * The source PNG is square with the mark bled to its edges, so the only sizing
 * decision here is the box; `sizes` keeps Next from shipping the full 1228px
 * original for a 40px mark.
 */
export function Mark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      {/* The source PNG carries its own whitespace margin, so it is scaled past
          the frame and pulled back — the same 138% / -19% crop the design uses —
          otherwise the mark floats small inside its circle. */}
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        priority
        className="block h-[138%] w-[138%] max-w-none -translate-x-[13.8%] -translate-y-[13.8%]"
      />
    </span>
  );
}

export function Wordmark({
  size = 40,
  showTagline = true,
  className = "",
}: {
  size?: number;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[22px] tracking-[-0.02em] text-ink">Nnneva</span>
        {showTagline && (
          <span className="mt-1 text-[11px] text-muted-2">your maternal-care agent</span>
        )}
      </span>
    </span>
  );
}
