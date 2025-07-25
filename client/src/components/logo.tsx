export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House icon with warm colors */}
      <g>
        {/* House base */}
        <rect
          x="10"
          y="35"
          width="36"
          height="30"
          rx="3"
          fill="currentColor"
          opacity="0.8"
        />
        {/* House roof */}
        <path
          d="M7 38 L28 17 L49 38 L44 38 L28 22 L12 38 Z"
          fill="currentColor"
        />
        {/* Door */}
        <rect
          x="24"
          y="48"
          width="8"
          height="17"
          rx="1.5"
          fill="white"
          opacity="0.9"
        />
        {/* Window */}
        <rect
          x="16"
          y="40"
          width="6"
          height="6"
          rx="1"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="34"
          y="40"
          width="6"
          height="6"
          rx="1"
          fill="white"
          opacity="0.9"
        />
      </g>

      {/* Text "Home Base" in linear layout */}
      <g fill="currentColor">
        {/* "Home Base" as one line */}
        <text
          x="65"
          y="50"
          fontSize="24"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Home Base
        </text>
      </g>
    </svg>
  );
}