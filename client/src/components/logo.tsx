export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 500 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* House icon with warm colors - positioned left */}
      <g transform="translate(10, 5)">
        {/* House base */}
        <rect
          x="0"
          y="35"
          width="70"
          height="60"
          rx="6"
          fill="currentColor"
          opacity="0.8"
        />
        {/* House roof */}
        <path
          d="M-8 42 L35 5 L78 42 L70 42 L35 15 L0 42 Z"
          fill="currentColor"
        />
        {/* Door */}
        <rect
          x="26"
          y="65"
          width="18"
          height="30"
          rx="3"
          fill="white"
          opacity="0.9"
        />
        {/* Windows */}
        <rect
          x="10"
          y="48"
          width="12"
          height="12"
          rx="2"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="48"
          y="48"
          width="12"
          height="12"
          rx="2"
          fill="white"
          opacity="0.9"
        />
      </g>

      {/* Text "Home Base" - aligned with bottom of house */}
      <g fill="currentColor">
        <text
          x="280"
          y="85"
          fontSize="65"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          dominantBaseline="baseline"
        >
          Home Base
        </text>
      </g>
    </svg>
  );
}