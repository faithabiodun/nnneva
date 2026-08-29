import React, { useState } from 'react';

/**
 * A photo that degrades instead of breaking.
 *
 * The profile and social-proof avatars are hot-linked from Unsplash, so any
 * blocked request, offline moment or expired URL left a broken-image glyph in
 * the header and in the "50K+ mothers" row. This swaps in a soft tinted disc on
 * error, which reads as a person without pretending to be a specific one.
 */
export const Avatar: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`bg-[#F3DCE2] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-1/2 h-1/2 text-[#D8486A]" aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.4" fill="currentColor" opacity="0.75" />
          <path
            d="M4.8 20c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};
