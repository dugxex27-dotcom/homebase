import { describe, expect, it, vi } from "vitest";
import { resolvePropertyCoordinates, type PropertyGeocoder } from "./geocoding-service";

describe("resolvePropertyCoordinates", () => {
  it("returns persisted coordinates without calling the geocoder", async () => {
    const geocoder = vi.fn<PropertyGeocoder>();
    const persist = vi.fn().mockResolvedValue({ latitude: 40.7128, longitude: -74.006 });

    await expect(resolvePropertyCoordinates({
      id: "house-1",
      address: "123 Main Street",
      latitude: "40.7128",
      longitude: "-74.0060",
    }, persist, geocoder)).resolves.toEqual({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(geocoder).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("geocodes once, persists the result, and coalesces concurrent requests", async () => {
    let release: ((coordinates: { latitude: number; longitude: number }) => void) | undefined;
    const geocoder = vi.fn<PropertyGeocoder>().mockReturnValue(new Promise((resolve) => {
      release = resolve;
    }));
    const persist = vi.fn().mockResolvedValue({ latitude: 34.0522, longitude: -118.2437 });
    const house = {
      id: "house-2",
      address: "456 Oak Avenue",
      latitude: null,
      longitude: null,
    };

    const first = resolvePropertyCoordinates(house, persist, geocoder);
    const second = resolvePropertyCoordinates(house, persist, geocoder);
    expect(geocoder).toHaveBeenCalledTimes(1);

    release!({ latitude: 34.0522, longitude: -118.2437 });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { latitude: 34.0522, longitude: -118.2437 },
      { latitude: 34.0522, longitude: -118.2437 },
    ]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ latitude: 34.0522, longitude: -118.2437 });
  });

  it("fails safely without an address or when geocoding returns no result", async () => {
    const geocoder = vi.fn<PropertyGeocoder>().mockResolvedValue(null);
    const persist = vi.fn().mockResolvedValue({ latitude: 0, longitude: 0 });

    await expect(resolvePropertyCoordinates({ latitude: null, longitude: null }, persist, geocoder))
      .resolves.toBeNull();
    await expect(resolvePropertyCoordinates({
      id: "house-3",
      address: "Unresolvable address",
      latitude: null,
      longitude: null,
    }, persist, geocoder)).resolves.toBeNull();
    expect(persist).not.toHaveBeenCalled();
  });

  it("fails safely when geocoding or coordinate persistence throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rejectedGeocoder = vi.fn<PropertyGeocoder>().mockRejectedValue(new Error("network unavailable"));
    const successfulGeocoder = vi.fn<PropertyGeocoder>().mockResolvedValue({
      latitude: 41.8781,
      longitude: -87.6298,
    });
    const rejectedPersist = vi.fn().mockRejectedValue(new Error("database unavailable"));

    await expect(resolvePropertyCoordinates({
      id: "house-4",
      address: "Network Failure Street",
    }, undefined, rejectedGeocoder)).resolves.toBeNull();
    await expect(resolvePropertyCoordinates({
      id: "house-5",
      address: "Persistence Failure Street",
    }, rejectedPersist, successfulGeocoder)).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("discards coordinates when the conditional persistence claim is stale", async () => {
    const geocoder = vi.fn<PropertyGeocoder>().mockResolvedValue({
      latitude: 47.6062,
      longitude: -122.3321,
    });
    const stalePersist = vi.fn().mockResolvedValue(null);

    await expect(resolvePropertyCoordinates({
      id: "house-6",
      address: "Address Changed Avenue",
    }, stalePersist, geocoder)).resolves.toBeNull();
    expect(stalePersist).toHaveBeenCalledOnce();
  });
});