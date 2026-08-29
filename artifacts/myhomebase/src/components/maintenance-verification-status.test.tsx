import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getMaintenanceVerificationState,
  MaintenanceVerificationStatus,
} from "./maintenance-verification-status";

afterEach(cleanup);

describe("MaintenanceVerificationStatus", () => {
  it.each([
    ["pending", "Pending verification"],
    ["photo_verified", "Verified by photo evidence"],
    ["contractor_verified", "Verified by contractor"],
    ["self_reported", "Self-reported / unverified"],
    ["review_needed", "Review needed"],
  ] as const)("renders the %s homeowner state", (state, label) => {
    render(
      <MaintenanceVerificationStatus
        verificationTier={state === "review_needed" ? "self_reported" : state}
        aiVerificationStatus={
          state === "pending" || state === "review_needed" ? state : "verified"
        }
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(
      screen.getByTestId(`maintenance-verification-status-${state}`),
    ).toHaveAttribute("aria-label");
  });

  it("explains that photo verification is not professional confirmation", () => {
    render(
      <MaintenanceVerificationStatus
        verificationTier="photo_verified"
        aiVerificationStatus="verified"
      />,
    );

    expect(
      screen.getByText(
        "Photo and evidence checks passed. This is not a professional or contractor confirmation.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Verified by contractor")).not.toBeInTheDocument();
  });

  it("keeps contractor verification distinct from photo verification", () => {
    render(
      <MaintenanceVerificationStatus
        verificationTier="contractor_verified"
        aiVerificationStatus="not_run"
      />,
    );

    expect(screen.getByText("Verified by contractor")).toBeInTheDocument();
    expect(
      screen.queryByText("Verified by photo evidence"),
    ).not.toBeInTheDocument();
  });

  it("prioritizes pending and review-needed statuses over a tier", () => {
    expect(
      getMaintenanceVerificationState({
        verificationTier: "photo_verified",
        aiVerificationStatus: "pending",
      }),
    ).toBe("pending");
    expect(
      getMaintenanceVerificationState({
        verificationTier: "contractor_verified",
        aiVerificationStatus: "review_needed",
      }),
    ).toBe("review_needed");
  });

  it("falls back conservatively for legacy, rejected, and unknown values", () => {
    expect(getMaintenanceVerificationState()).toBe("self_reported");
    expect(
      getMaintenanceVerificationState({
        verificationTier: "photo_verified",
        aiVerificationStatus: "rejected",
      }),
    ).toBe("self_reported");
    expect(
      getMaintenanceVerificationState({
        verificationTier: "photo_verified",
        aiVerificationStatus: "something_new",
      }),
    ).toBe("self_reported");
  });
});