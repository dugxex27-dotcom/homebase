export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* House icon with warm colors - centered and larger */}
      <g transform="translate(20, 10)">
        {/* House base */}
        <rect
          x="0"
          y="40"
          width="48"
          height="40"
          rx="4"
          fill="currentColor"
          opacity="0.8"
        />
        {/* House roof */}
        <path
          d="M-5 45 L24 15 L53 45 L47 45 L24 22 L1 45 Z"
          fill="currentColor"
        />
        {/* Door */}
        <rect
          x="18"
          y="55"
          width="12"
          height="25"
          rx="2"
          fill="white"
          opacity="0.9"
        />
        {/* Windows */}
        <rect
          x="8"
          y="48"
          width="8"
          height="8"
          rx="1.5"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="32"
          y="48"
          width="8"
          height="8"
          rx="1.5"
          fill="white"
          opacity="0.9"
        />
      </g>

      {/* Text "Home Base" - centered */}
      <g fill="currentColor">
        <text
          x="200"
          y="60"
          fontSize="32"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          Home Base
        </text>
      </g>
    </svg>
  );
}