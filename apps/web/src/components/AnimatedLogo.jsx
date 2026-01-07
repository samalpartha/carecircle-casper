import React from "react";

export default function AnimatedLogo({ title = "CareCircle" }) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="ccg" x1="10" y1="10" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="ccRing" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eafff1" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#d7fff6" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f7ffe6" stopOpacity="0.95" />
        </linearGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.65 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <g className="cc-logo-orbit" style={{ transformOrigin: "24px 24px" }}>
        <circle cx="24" cy="24" r="19.5" stroke="url(#ccRing)" strokeWidth="2.8" opacity="0.92" />
        <circle cx="24" cy="5.4" r="2.85" fill="white" opacity="0.95" />
      </g>

      {/* Core mark - larger heart */}
      <g className="cc-logo-core" filter="url(#softGlow)" transform="translate(24, 24) scale(1.6) translate(-24, -24)">
        <path
          d="M24 34s-9.5-5.6-9.5-13c0-4.1 2.9-6.9 6.6-6.9c1.9 0 3.6.9 4.9 2.4c1.3-1.5 3-2.4 4.9-2.4c3.7 0 6.6 2.8 6.6 6.9C37.5 28.4 24 34 24 34Z"
          fill="url(#ccg)"
        />
        <path
          d="M21.3 24.2l2.0 2.1 4.9-5.2"
          stroke="#0a0a0f"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}


