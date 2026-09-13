import { describe, expect, it } from "vitest";
import { getIdempotentNotificationId } from "./notification-idempotency";

const base = {
  homeownerId: "user-1",
  houseId: "house-1",
  type: "maintenance_due",
  category: "maintenance",
  title: "Maintenance Task Due",
  message: "Prepare for weather transition is due this month.",
  scheduledFor: "2026-09-13T10:00:00.000Z",
};

describe("notification idempotency", () => {
  it("uses the same ID for repeated task events", () => {
    const first = getIdempotentNotificationId({ ...base, maintenanceTaskId: "task-september" });
    const retry = getIdempotentNotificationId({
      ...base,
      maintenanceTaskId: "task-september",
      scheduledFor: "2026-09-13T18:00:00.000Z",
    });
    expect(retry).toBe(first);
    expect(getIdempotentNotificationId({
      ...base,
      maintenanceTaskId: "task-september",
      type: "maintenance_overdue",
      message: "Prepare for weather transition is overdue! Only 5 days left this month. Estimated time: 30-60 minutes.",
    })).toBe(first);
  });

  it("keeps different tasks and reminder occurrences distinct", () => {
    expect(getIdempotentNotificationId({ ...base, maintenanceTaskId: "task-a" }))
      .not.toBe(getIdempotentNotificationId({
        ...base,
        maintenanceTaskId: "task-b",
        message: "Inspect the roof is due this month.",
      }));
    expect(getIdempotentNotificationId({ ...base, scheduledFor: "2026-10-01T10:00:00.000Z" }))
      .not.toBe(getIdempotentNotificationId(base));
  });

  it("keeps an appointment's separately scheduled reminders distinct", () => {
    const appointment = { ...base, appointmentId: "appointment-1", type: "appointment" };
    expect(getIdempotentNotificationId(appointment)).not.toBe(
      getIdempotentNotificationId({ ...appointment, scheduledFor: "2026-09-13T14:00:00.000Z" }),
    );
  });

  it("deduplicates a weather event even when its generated task count changes", () => {
    const weather = { ...base, category: "weather", type: "weather_forecast_rain" };
    expect(getIdempotentNotificationId(weather)).toBe(
      getIdempotentNotificationId({ ...weather, message: "A different task count" }),
    );
  });

  it("deduplicates regional suggestions for the same month but allows a later month", () => {
    const regional = {
      ...base,
      maintenanceTaskId: undefined,
      title: "Pacific Northwest Regional Consideration",
      message: "Year-round moisture and mold management",
    };
    expect(getIdempotentNotificationId(regional)).toBe(
      getIdempotentNotificationId({ ...regional, scheduledFor: "2026-09-29T10:00:00.000Z" }),
    );
    expect(getIdempotentNotificationId(regional)).not.toBe(
      getIdempotentNotificationId({ ...regional, scheduledFor: "2026-10-01T10:00:00.000Z" }),
    );
  });
});