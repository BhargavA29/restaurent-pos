import type { CSSProperties } from "react";

export function FryMascotSvg({
  size = 32,
  style,
}: {
  size?: number | string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={style}
    >
      {/* Celebratory comic sparkles */}
      <path
        d="M 14 27 L 20 31 M 12 37 L 19 37"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M 85 25 L 79 30 M 88 35 L 81 36"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Left arm bent at hip */}
      <path
        d="M 33 58 C 19 59 18 71 30 73 L 38 72 L 37 66 L 30 66 C 26 66 26 63 32 63 Z"
        fill="#ffbe3b"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Golden fries fanning out of cone */}
      <path
        d="M 27 36 L 22 20 C 21.5 18 23 16.5 25 16.5 L 30 17 C 32 17 33 18.5 33.5 20.5 L 36 37 Z"
        fill="#ffbd2e"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 35 36 L 34 15 C 34 13 35.5 11.5 37.5 11.5 L 42.5 11.5 C 44.5 11.5 46 13 46 15 L 45 36 Z"
        fill="#ffd24d"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 45 35 L 46 11.5 C 46 9.5 47.5 8 49.5 8 L 54.5 8 C 56.5 8 58 9.5 58 11.5 L 55.5 36 Z"
        fill="#ffdf6e"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 54.5 36 L 57.5 14.5 C 58 12.5 59.5 11.5 61.5 12 L 66 13 C 68 13.5 69 15.5 68.5 17.5 L 62.5 37.5 Z"
        fill="#ffd24d"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 62 38 L 68.5 20.5 C 69.5 18.5 71.5 18 73.5 19 L 76.5 20.5 C 78.5 21.5 79 23.5 78 25.5 L 68.5 41 Z"
        fill="#ffbd2e"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Right arm reaching to thumbs-up */}
      <path
        d="M 62 57 Q 71 58 74.5 52.5 L 78.5 56 C 74 63 67 63.5 60 62 Z"
        fill="#ffbe3b"
        stroke="#240900"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Orange fry cone */}
      <path
        d="M 24 34 Q 49 41.5 74 37 L 46.5 86 Q 43 91 39.5 85.5 Z"
        fill="#f73e00"
        stroke="#240900"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />

      {/* Cone subtle highlight */}
      <path
        d="M 29.5 39 L 41.5 76"
        stroke="#ff7a3d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Cool black sunglasses */}
      <path
        d="M 26.5 44.5 Q 49 42.5 71 48"
        stroke="#240900"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 29 44.5 Q 38 43.5 46.5 46.5 L 44.5 55 Q 36 58.5 29 52 Z"
        fill="#1e0700"
        stroke="#240900"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M 51 47 Q 60 45.5 68.5 48.5 L 64.5 56 Q 55.5 59.5 50 54.5 Z"
        fill="#1e0700"
        stroke="#240900"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M 33 48.5 L 36.5 47 M 54.5 50 L 58 49"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Smile */}
      <path
        d="M 40.5 60.5 Q 46.5 66.5 53 61.5"
        stroke="#240900"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* White cartoon glove thumbs-up */}
      <path
        d="M 74 49 L 76.5 40.5 C 77.5 37.5 81 37.5 82 40.5 C 82.5 42.5 81.5 45 81 47 L 85.5 47 C 87.8 47 89 48.5 89 50.2 C 89 52 87.5 53 86.2 53.3 C 88 54 88.5 55.5 87.5 57 C 86.5 58.5 84.5 59.5 78.5 59.5 L 73.5 58 Z"
        fill="#ffffff"
        stroke="#240900"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M 81.5 51 L 85.5 51 M 81.5 55 L 85.5 55"
        stroke="#240900"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLogo({ size = 32 }: { size?: number }) {
  const iconSize = Math.round(size * 0.92);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#ff6600]"
      style={{ width: size, height: size }}
    >
      <FryMascotSvg size={iconSize} />
    </span>
  );
}
