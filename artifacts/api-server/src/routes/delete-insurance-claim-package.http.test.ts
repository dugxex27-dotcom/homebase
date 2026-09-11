import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createDeleteInsuranceClaimPackageHandler } from "./delete-insurance-claim-package";

const OWNER_ID = "homeowner-owner";
const OTHER_ID = "homeowner-other";
const HOUSE_ID = "house-owner";
const OTHER_HOUSE_ID = "house-other";
const PACKAGE_ID = "package-owner";

function createHarness(sessionHomeownerId: string) {
  const packages = new Map([
    [PACKAGE_ID, { id: PACKAGE_ID, houseId: HOUSE_ID, homeownerId: OWNER_ID }],
  ]);
  const storage = {
    async deleteInsuranceClaimPackage(
      packageId: string,
      houseId: string,
      homeownerId: string,
    ) {
      const pkg = packages.get(packageId);
      if (!pkg || pkg.houseId !== houseId || pkg.homeownerId !== homeownerId) {
        return false;
      }
      return packages.delete(packageId);
    },
  };
  const app = express();
  app.use((req: any, _res, next) => {
    req.session = { user: { id: sessionHomeownerId } };
    next();
  });
  app.delete(
    "/api/houses/:houseId/insurance-claim-packages/:packageId",
    createDeleteInsuranceClaimPackageHandler(storage),
  );
  return { app, packages };
}

describe("DELETE insurance claim package ownership", () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness(OWNER_ID);
  });

  it("deletes a package when package, house, and homeowner all match", async () => {
    const response = await request(harness.app)
      .delete(`/api/houses/${HOUSE_ID}/insurance-claim-packages/${PACKAGE_ID}`);

    expect(response.status).toBe(204);
    expect(harness.packages.has(PACKAGE_ID)).toBe(false);
  });

  it("returns not found and preserves data for another homeowner", async () => {
    harness = createHarness(OTHER_ID);
    const response = await request(harness.app)
      .delete(`/api/houses/${HOUSE_ID}/insurance-claim-packages/${PACKAGE_ID}`);

    expect(response.status).toBe(404);
    expect(harness.packages.has(PACKAGE_ID)).toBe(true);
  });

  it("returns not found and preserves data for a mismatched house", async () => {
    const response = await request(harness.app)
      .delete(`/api/houses/${OTHER_HOUSE_ID}/insurance-claim-packages/${PACKAGE_ID}`);

    expect(response.status).toBe(404);
    expect(harness.packages.has(PACKAGE_ID)).toBe(true);
  });

  it("returns not found without deleting other data when the package is missing", async () => {
    const response = await request(harness.app)
      .delete(`/api/houses/${HOUSE_ID}/insurance-claim-packages/missing-package`);

    expect(response.status).toBe(404);
    expect(harness.packages.has(PACKAGE_ID)).toBe(true);
  });
});