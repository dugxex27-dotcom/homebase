import { useState, useEffect, type RefObject } from "react";
import { ChevronUp } from "lucide-react";

interface BackToTopProps {
  bottom?: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export default function BackToTop({ bottom = 24, scrollContainerRef }: BackToTopProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const scrollTarget = scrollContainerRef?.current ?? window;
    const onScroll = () => {
      const scrollTop = scrollTarget instanceof Window ? scrollTarget.scrollY : scrollTarget.scrollTop;
      setShow(scrollTop > 300);
    };

    onScroll();
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef]);

  if (!show) return null;

  return (
    <button
      onClick={() => (scrollContainerRef?.current ?? window).scrollTo({ top: 0, behavior: "smooth" })}
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
