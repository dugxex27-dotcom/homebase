import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AchievementProgressStrip } from "./achievement-progress-strip";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function renderStrip() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AchievementProgressStrip />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AchievementProgressStrip", () => {
  it("shows earned awards and the closest real progress milestone", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        achievements: [
          {
            key: "first_step",
            name: "First Step",
            description: "Complete your first maintenance task.",
            icon: "trophy",
            isUnlocked: true,
            progress: 100,
            unlockedAt: "2026-09-10T12:00:00.000Z",
          },
          {
            key: "organized_home",
            name: "Organized Home",
            description: "Add documents to your home record.",
            icon: "file-text",
            isUnlocked: false,
            progress: 75,
          },
          {
            key: "season_ready",
            name: "Season Ready",
            description: "Complete seasonal maintenance.",
            icon: "leaf",
            isUnlocked: false,
            progress: 25,
          },
        ],
      }),
    }));

    renderStrip();

    expect(screen.getByText("Loading your awards…")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/1 of 3 unlocked/)).toBeTruthy());
    expect(screen.getByText(/Latest: First Step/)).toBeTruthy();
    expect(screen.getByText("Next: Organized Home")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("75");
    expect(screen.getByRole("link", { name: /View all/i }).getAttribute("href")).toBe("/achievements");
  });

  it("shows a useful empty state when no definitions are available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ achievements: [] }),
    }));

    renderStrip();

    await waitFor(() => {
      expect(screen.getByText("Complete home-care actions to start earning awards.")).toBeTruthy();
    });
  });
});