import React from 'react';

interface NnnevaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const NnnevaEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 40,
}) => {
  return (
    <div
      className={`relative shrink-0 flex items-center justify-center ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-label="Nnneva Logo Emblem"
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Top-Right Ambient Arc Swoosh */}
        <path
          d="M102 30C125 32 145 42 158 59C167 71 171 85 170 94C169.5 95.5 168 96 167 95C165.5 93 162.5 82 154 70C142 54 124 43 102 40C99.5 39.5 99.5 30 102 30Z"
          fill="#FA628B"
        />

        {/* Main Solid Pink Circle */}
        <circle cx="96" cy="104" r="74" fill="#FA628B" />

        {/* Pregnant Mother Silhouette (White) */}
        {/* Head, Profile, Hair, Body, and Bump */}
        <path
          d="M98 48C90 48 82.5 54 77.5 62C73.5 68.5 71.5 76 70 83C68.5 89.5 66 96 63.5 101C64.5 98 66.5 93 68.5 87C71 79.5 74.5 72 79.5 66C84 60.5 90 56.5 96.5 55C93 57.5 90 62 88.5 67C86.5 74 86 82 85 89.5C83.8 98 80.5 106 74 113C70.5 116.5 66.5 120 63 124C65.5 125 68.5 125 71 123.5C75 121 78.5 116 80 111.5C81.5 106.5 81 99.5 82 94C83 88 85.5 82.5 88.5 77.5C90.5 74 93.5 70 97 67C98 66 100 65 101.5 64.5C103.5 64 105 64.8 106 66.5C107.5 69 106.5 72 105.5 74.5C105 76 105.5 77 106.8 77.2C108.5 77.5 109 76 109 74.5C109.2 73 108.8 71.5 108 70C108.5 68.5 109.5 67 110.5 66.5C112 66 113.5 67.5 114 69.5C114.5 71.5 114 73.5 113.2 75.5C112.5 77.2 113 78.5 114.5 79.2C116 80 117.5 78.8 118 77C118.8 74 117.5 70.5 115.5 67.8C117 68.5 118.5 70 119.5 72C120.2 73.5 121 75 121.2 76.8C121.5 78.5 120.5 80 119.5 81.2C118.5 82.5 117 83.2 115.8 84C114 85.2 113.2 86.8 113.8 88.5C114.5 90.2 116.2 90.8 118 90.2C121 89.2 123.5 86.5 124.5 83.5C125 81.8 126.5 80.5 128.2 81C129.5 81.5 130 83 129.2 84.8C127.8 88 124.5 91.5 120.8 93.5C117.5 95.2 113.5 96.5 110 97.2C106.5 98 103.5 100 101.5 103C98 108 97.5 114.5 98.8 120.5C100.5 128 104.5 134.5 109.5 140C114.5 145.5 120.5 150 127 153C122.5 158 116 162 108.5 164C99.5 166.5 90 165.5 82 161.5C85.5 165 90 167.5 95 169C91.5 169 88 168.2 85 166.5C88 170 93.5 172.5 100 173C116 174 130.5 164 139 150.5C144.5 141.5 146.5 130.5 144 120C142 112 136.5 104.5 130.5 98.5C127 95 123 92 119 89C116.5 87 114 84.5 112.5 82C111.5 80 111.8 78 113 76.5C113.8 75.5 115 74.8 116.2 74C117.8 73 118.5 71 117.8 69C117 67 115 65.5 113 65C111.5 64.5 110 64.8 108.8 65.5C107.5 63 105 60 102 57.5C101 56.5 100 55.5 99 54.5C98.5 53 98.2 50.5 98 48Z"
          fill="#FFFFFF"
        />

        {/* Flowing Back Locks / Hair Detail */}
        <path
          d="M87 75C84 83 81.5 92 78 100C75 107 70.5 113 65 118C62.5 120.5 60 118 61 115C63 109 66 103 68.5 97C72 88 76 79 81.5 71C83.2 68.5 85.5 66 88 64C87.5 67.5 87.2 71.5 87 75Z"
          fill="#FFFFFF"
        />

        {/* Smooth Pregnant Bump & Breast Curve */}
        <path
          d="M102 103C104.5 99.5 108 97.5 112 96.5C117 95.2 121.5 93 125 89.5C129.5 94.5 134.5 101.5 136.5 108.5C138.5 115.5 138 123 134.5 129.5C130 138 122 144.5 113 148C107 141 102.5 132.5 100.5 123.5C99 116.5 99.5 109 102 103Z"
          fill="#FFFFFF"
        />

        {/* Lower Bump Base Sweep */}
        <path
          d="M100 125C102 134 107 142.5 113 149C119.5 156 128 161 137.5 163.5C128.5 169 117 171 106 169C97 167.5 88.5 163 81.5 156.5C89 158.5 97 157.5 104 153.5C109.5 150.5 114 146 117.5 140.5C111.5 137.5 106 132 101.5 125.5C101 125.2 100.5 125.1 100 125Z"
          fill="#FFFFFF"
        />

        {/* Hand resting gently over baby bump (delicate leaf shape accent) */}
        <path
          d="M125 115C131 118 136 123 135 129C134 135 128 138 122 137C127 134 130 129.5 129 124.5C128 120.5 125.5 117.5 125 115Z"
          fill="#FA628B"
        />
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

