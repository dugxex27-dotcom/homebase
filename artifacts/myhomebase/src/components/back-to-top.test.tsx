import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BackToTop from "./back-to-top";

describe("BackToTop", () => {
  it("tracks and scrolls the authenticated content container", () => {
    const scrollContainer = document.createElement("main");
    const scrollTo = vi.fn();
    Object.defineProperty(scrollContainer, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(scrollContainer, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    const scrollContainerRef = createRef<HTMLElement>();
    scrollContainerRef.current = scrollContainer;

    render(<BackToTop scrollContainerRef={scrollContainerRef} />);
    expect(screen.queryByTestId("button-back-to-top")).not.toBeInTheDocument();

    scrollContainer.scrollTop = 301;
    fireEvent.scroll(scrollContainer);

    fireEvent.click(screen.getByTestId("button-back-to-top"));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});