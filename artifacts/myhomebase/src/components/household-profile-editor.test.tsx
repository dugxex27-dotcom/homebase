import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HouseholdProfileEditor } from "./household-profile-editor";

const { apiRequest, invalidateQueries, setQueryData, toast } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({ apiRequest }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries, setQueryData }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

function response() {
  return { json: vi.fn().mockResolvedValue({}) };
}

const CURRENT_PROFILE = {
  squareFootage: 1000,
  homeType: null,
  yearBuilt: null,
  roofType: null,
  hvacType: null,
  roofInstalledYear: null,
  hvacInstalledYear: null,
  waterHeaterInstalledYear: null,
  homeSystems: ["central-ac", "sump-pump"],
} as any;

function editor(
  open: boolean,
  onOpenChange = vi.fn(),
  houseId = "house-1",
  currentProfile = CURRENT_PROFILE,
) {
  return (
    <HouseholdProfileEditor
      open={open}
      onOpenChange={onOpenChange}
      houseId={houseId}
      currentProfile={currentProfile}
    />
  );
}

function renderEditor(onOpenChange = vi.fn()) {
  return render(editor(true, onOpenChange));
}

describe("HouseholdProfileEditor autosave", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiRequest.mockReset();
    invalidateQueries.mockReset();
    setQueryData.mockReset();
    toast.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces a valid edit and shows Saved after PATCH succeeds", async () => {
    apiRequest.mockResolvedValue(response());
    renderEditor();

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1200" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(apiRequest).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/houses/house-1/profile",
      "PATCH",
      expect.objectContaining({ squareFootage: 1200 }),
    );
    expect(setQueryData.mock.calls[0]?.[0]).toEqual(["/api/houses"]);
    const updateCachedHouses = setQueryData.mock.calls[0]?.[1];
    const otherHouse = {
      id: "house-2",
      squareFootage: 900,
      homeSystems: ["plumbing"],
    };
    expect(updateCachedHouses([{
      id: "house-1",
      squareFootage: 1000,
      homeSystems: ["hvac", "roof"],
    }, otherHouse])).toEqual([{
      id: "house-1",
      squareFootage: 1200,
      homeSystems: ["central-ac", "sump-pump"],
    }, otherHouse]);
    expect(screen.getByTestId("profile-save-status")).toHaveTextContent("Saved");
  });

  it("pre-checks saved home systems and autosaves changes", async () => {
    apiRequest.mockResolvedValue(response());
    renderEditor();

    expect(screen.getByTestId("checkbox-home-system-central-ac")).toBeChecked();
    expect(screen.getByTestId("checkbox-home-system-sump-pump")).toBeChecked();
    expect(screen.getByTestId("checkbox-home-system-gas-furnace")).not.toBeChecked();

    fireEvent.click(screen.getByTestId("checkbox-home-system-gas-furnace"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/houses/house-1/profile",
      "PATCH",
      expect.objectContaining({
        homeSystems: ["central-ac", "sump-pump", "gas-furnace"],
      }),
    );
  });

  it("serializes saves and persists the newest values last", async () => {
    let finishFirst!: (value: ReturnType<typeof response>) => void;
    apiRequest
      .mockImplementationOnce(() => new Promise((resolve) => {
        finishFirst = resolve;
      }))
      .mockResolvedValueOnce(response());
    renderEditor();

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1200" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1400" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(apiRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishFirst(response());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[1][2]).toEqual(
      expect.objectContaining({ squareFootage: 1400 }),
    );
    expect(screen.getByTestId("profile-save-status")).toHaveTextContent("Saved");
  });

  it("flushes a valid final edit when closed before the debounce", async () => {
    const onOpenChange = vi.fn();
    apiRequest.mockResolvedValue(response());
    renderEditor(onOpenChange);

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1600" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest.mock.calls[0][2]).toEqual(
      expect.objectContaining({ squareFootage: 1600 }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reports a failed autosave without claiming the edit was saved", async () => {
    apiRequest.mockRejectedValue(new Error("Network unavailable"));
    renderEditor();

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1800" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Update Failed",
      variant: "destructive",
    }));
    expect(screen.getByTestId("profile-save-status")).not.toHaveTextContent("Saved");
  });

  it("keeps a queued close-time edit through a close and immediate reopen", async () => {
    let finishFirst!: (value: ReturnType<typeof response>) => void;
    const onOpenChange = vi.fn();
    apiRequest
      .mockImplementationOnce(() => new Promise((resolve) => {
        finishFirst = resolve;
      }))
      .mockResolvedValueOnce(response());
    const { rerender } = renderEditor(onOpenChange);

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1200" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1400" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await act(async () => {
      await Promise.resolve();
    });

    rerender(editor(false, onOpenChange));
    rerender(editor(true, onOpenChange));
    expect(screen.getByTestId("input-square-footage")).toHaveValue(1400);

    await act(async () => {
      finishFirst(response());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[1][2]).toEqual(
      expect.objectContaining({ squareFootage: 1400 }),
    );
  });

  it("still saves the newest queued edit when an earlier request fails", async () => {
    let failFirst!: (error: Error) => void;
    apiRequest
      .mockImplementationOnce(() => new Promise((_resolve, reject) => {
        failFirst = reject;
      }))
      .mockResolvedValueOnce(response());
    renderEditor();

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1200" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "1400" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    await act(async () => {
      failFirst(new Error("First save failed"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[1][2]).toEqual(
      expect.objectContaining({ squareFootage: 1400 }),
    );
    expect(screen.getByTestId("profile-save-status")).toHaveTextContent("Saved");
  });

  it("resets the editor and save target when the house changes", async () => {
    apiRequest.mockResolvedValue(response());
    const onOpenChange = vi.fn();
    const { rerender } = renderEditor(onOpenChange);

    rerender(editor(true, onOpenChange, "house-2", {
      ...CURRENT_PROFILE,
      squareFootage: 2000,
    }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("input-square-footage")).toHaveValue(2000);

    fireEvent.change(screen.getByTestId("input-square-footage"), {
      target: { value: "2100" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/houses/house-2/profile",
      "PATCH",
      expect.objectContaining({ squareFootage: 2100 }),
    );
  });
});