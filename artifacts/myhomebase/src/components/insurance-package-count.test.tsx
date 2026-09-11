import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cacheGeneratedInsurancePackage,
  InsurancePrepCountLabel,
  insurancePackageQueryKey,
} from "./insurance-package-count";

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

function renderLabel(
  packagesByHouse: Record<string, unknown[]>,
  houseIds = Object.keys(packagesByHouse),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  for (const [houseId, packages] of Object.entries(packagesByHouse)) {
    queryClient.setQueryData(insurancePackageQueryKey(houseId), packages);
  }
  render(
    <QueryClientProvider client={queryClient}>
      <button>
        <InsurancePrepCountLabel
          houses={houseIds.map((id) => ({ id }))}
          enabled
        />
      </button>
    </QueryClientProvider>,
  );
  return queryClient;
}

afterEach(cleanup);

describe("Insurance Prep package badge", () => {
  it("does not display a zero count when no packages exist", () => {
    renderLabel({ "house-1": [], "house-2": [] });
    expect(screen.getByRole("button")).toHaveTextContent("Insurance Prep");
    expect(screen.getByRole("button")).not.toHaveTextContent("(0)");
  });

  it("totals saved packages across multiple houses", () => {
    renderLabel({
      "house-1": [{ id: "pkg-1" }, { id: "pkg-2" }],
      "house-2": [{ id: "pkg-3" }],
    });
    expect(screen.getByRole("button")).toHaveTextContent("Insurance Prep (3)");
  });

  it("updates immediately when generation caches a newly saved package", async () => {
    const queryClient = renderLabel({
      "house-1": [{ id: "pkg-1" }],
      "house-2": [{ id: "pkg-2" }],
    });
    expect(screen.getByRole("button")).toHaveTextContent("Insurance Prep (2)");

    act(() => {
      cacheGeneratedInsurancePackage(queryClient, "house-2", { id: "pkg-3" });
    });

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Insurance Prep (3)");
    });
  });

  it("does not double-count a generated package returned again by refetch", () => {
    const queryClient = renderLabel({ "house-1": [{ id: "pkg-1" }] });

    act(() => {
      cacheGeneratedInsurancePackage(queryClient, "house-1", { id: "pkg-1" });
    });

    expect(screen.getByRole("button")).toHaveTextContent("Insurance Prep (1)");
  });
});