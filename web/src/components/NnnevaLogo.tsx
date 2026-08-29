import React, { useId } from 'react';

/** The disc and sliver pink, taken from the supplied logo. */
const PINK = '#F4628B';

interface NnnevaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const NnnevaEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 40,
}) => {
  // The clip path needs a document-unique id: the emblem renders up to three
  // times on one screen, and repeating an id makes every instance follow
  // whichever one mounted last.
  const clipId = useId();

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        role="img"
        aria-label="Nnneva"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="100" cy="101" r="79" />
          </clipPath>
        </defs>

        {/* Outer sliver. Both arcs share their endpoints and the returning one
            is slightly flatter, so the crescent tapers to points rather than
            ending square. */}
        <path fill={PINK} d="M84.9 15.3 A87.0 87.0 0 0 1 170.4 152.1 A94.0 94.0 0 0 0 84.9 15.3 Z" />

        <circle cx="100" cy="101" r="79" fill={PINK} />

        <g clipPath={`url(#${clipId})`}>
          {/* Head, hair and body as a single silhouette. The left edge carries
              two waves — the hair falling to about mid-torso, then the body
              beneath it — and the figure runs off the bottom of the disc. */}
          <path
            fill="#FFFFFF"
            d="M94 42C101 42 107 46 110 52C112 57 112 62 111 66C113 68 116 70 116 72C116 74 113 75 111 75C112 77 112 79 110 80C109 82 106 83 103 83C101 85 100 87 100 90C100 93 101 95 103 97C107 100 111 106 113 112C115 118 114 123 113 127C121 133 128 143 131 155C134 167 132 178 128 188C126 194 125 198 124 202L80 202C80 195 81 187 83 178C85 168 88 157 90 147C86 145 82 141 80 136C78 131 77 126 78 121C73 118 70 112 69 105C68 96 70 86 74 78C70 74 69 68 71 62C74 52 83 42 94 42Z"
          />

          {/* Hand resting high on the bump, read as a thin pink separation */}
          <path
            fill={PINK}
            d="M112 116C118 118 122 123 123 129C124 133 123 137 121 140C122 134 120 128 117 124C115 120 113 117 112 116Z"
          />
        </g>
      </svg>
    </div>
  );
};

export const NnnevaLogo: React.FC<NnnevaLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconPixel = size === 'sm' ? 34 : size === 'lg' ? 50 : size === 'xl' ? 64 : 42;

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Pink Circular Silhouette Emblem */}
      <NnnevaEmblem size={iconPixel} />

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className="font-serif-display text-2xl sm:text-[28px] font-normal tracking-tight text-[#15392B] leading-none">
            Nnneva
          </span>
          {/* Hidden below sm: the tagline only fits on one line from 640px up,
              and wrapping it to three lines under the wordmark pushed the
              header out of shape on a phone. Same breakpoint convention the
              nav already uses. */}
          <span className="hidden sm:block text-[10px] sm:text-[11px] font-medium tracking-wide text-gray-500 lowercase leading-tight mt-0.5">
            your maternal-care agent
          </span>
        </div>
      )}
    </div>
  );
};

