import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

interface BackToTopProps {
  bottom?: number;
}

export default function BackToTop({ bottom = 24 }: BackToTopProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      data-testid="button-back-to-top"
      style={{
        position: "fixed",
        bottom: `${bottom}px`,
        right: "16px",
        zIndex: 50,
        width: 44,
        height: 44,
        borderRadius: "50%",
        backgroundColor: "#2c0f5b",
        color: "white",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px rgba(44,15,91,0.45)",
        transition: "opacity 0.2s, transform 0.2s",
      }}
    >
      <ChevronUp style={{ width: 20, height: 20 }} />
    </button>
  );
}
