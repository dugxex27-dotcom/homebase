import { describe, expect, it } from "vitest";
import {
  countRecentNewLeads,
  getAppointmentsInNextSevenDays,
  hasScheduledAppointmentForProposal,
} from "./contractor-dashboard-stats";

const NOW = new Date("2026-08-25T12:00:00.000Z");

describe("contractor dashboard stat helpers", () => {
  it("counts only new leads created within the previous seven days", () => {
    expect(
      countRecentNewLeads(
        [
          { status: "new", createdAt: "2026-08-24T12:00:00.000Z" },
          { status: "new", createdAt: "2026-08-18T12:00:00.000Z" },
          { status: "new", createdAt: "2026-08-17T11:59:59.000Z" },
          { status: "contacted", createdAt: "2026-08-24T12:00:00.000Z" },
          { status: "new", createdAt: null },
        ],
        NOW,
      ),
    ).toBe(2);
  });

  it("limits the calendar count to the next seven days", () => {
    const appointments = getAppointmentsInNextSevenDays(
      [
        {
          homeownerId: "homeowner-1",
          serviceType: "HVAC",
          status: "scheduled",
          scheduledDateTime: "2026-09-01T12:00:00.000Z",
        },
        {
          homeownerId: "homeowner-2",
          serviceType: "Roofing",
          status: "scheduled",
          scheduledDateTime: "2026-09-01T12:00:01.000Z",
        },
        {
          homeownerId: "homeowner-3",
          serviceType: "Plumbing",
          status: "scheduled",
          scheduledDateTime: "2026-08-26T12:00:00.000Z",
        },
      ],
      NOW,
    );

    expect(appointments).toHaveLength(2);
    expect(appointments.map((appointment) => appointment.homeownerId)).toEqual([
      "homeowner-3",
      "homeowner-1",
    ]);
  });

  it("marks a proposal as scheduled only for a matching future appointment", () => {
    const proposal = { homeownerId: "homeowner-1", serviceType: "HVAC Repair" };

    expect(
      hasScheduledAppointmentForProposal(
        proposal,
        [
          {
            homeownerId: "homeowner-1",
            serviceType: "HVAC Repair",
            status: "scheduled",
            scheduledDateTime: "2026-08-26T12:00:00.000Z",
          },
        ],
        NOW,
      ),
    ).toBe(true);

    expect(
      hasScheduledAppointmentForProposal(
        proposal,
        [
          {
            homeownerId: "homeowner-1",
            serviceType: "HVAC Repair",
            status: "cancelled",
            scheduledDateTime: "2026-08-26T12:00:00.000Z",
          },
          {
            homeownerId: "homeowner-1",
            serviceType: "Roofing",
            status: "scheduled",
            scheduledDateTime: "2026-08-26T12:00:00.000Z",
          },
          {
            homeownerId: "homeowner-2",
            serviceType: "HVAC Repair",
            status: "scheduled",
            scheduledDateTime: "2026-08-26T12:00:00.000Z",
          },
          {
            homeownerId: "homeowner-1",
            serviceType: "HVAC Repair",
            status: "confirmed",
            scheduledDateTime: "2026-08-24T12:00:00.000Z",
          },
        ],
        NOW,
      ),
    ).toBe(false);
  });
});