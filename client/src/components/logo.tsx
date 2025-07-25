export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House icon with warm colors */}
      <g>
        {/* House base */}
        <rect
          x="8"
          y="28"
          width="24"
          height="20"
          rx="2"
          fill="currentColor"
          opacity="0.8"
        />
        {/* House roof */}
        <path
          d="M6 30 L20 16 L34 30 L30 30 L20 20 L10 30 Z"
          fill="currentColor"
        />
        {/* Door */}
        <rect
          x="17"
          y="36"
          width="6"
          height="12"
          rx="1"
          fill="white"
          opacity="0.9"
        />
        {/* Window */}
        <rect
          x="12"
          y="32"
          width="4"
          height="4"
          rx="0.5"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="24"
          y="32"
          width="4"
          height="4"
          rx="0.5"
          fill="white"
          opacity="0.9"
        />
      </g>

      {/* Text "Home Base" */}
      <g fill="currentColor">
        {/* "Home" */}
        <text
          x="45"
          y="25"
          fontSize="16"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Home
        </text>
        
        {/* "Base" */}
        <text
          x="45"
          y="42"
          fontSize="14"
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
          opacity="0.8"
        >
          Base
        </text>
      </g>
      
      {/* Decorative elements */}
      <circle cx="115" cy="20" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="115" cy="30" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="115" cy="40" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}