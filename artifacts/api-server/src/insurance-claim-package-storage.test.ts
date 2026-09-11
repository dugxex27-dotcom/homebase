import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbDelete,
  mockWhere,
  mockReturning,
  mockEq,
  mockAnd,
} = vi.hoisted(() => ({
  ...(() => {
    process.env.DISABLE_DEMO_DATA = "true";
    return {};
  })(),
  mockDbDelete: vi.fn(),
  mockWhere: vi.fn(),
  mockReturning: vi.fn(),
  mockEq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
  mockAnd: vi.fn((...conditions: unknown[]) => ({ conditions })),
}));

vi.mock("./db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: { delete: mockDbDelete },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, eq: mockEq, and: mockAnd };
});

import { DbStorage, MemStorage } from "./storage";

const packageRecord = {
  houseId: "house-owner",
  homeownerId: "homeowner-owner",
  claimArea: "Roof",
  incidentDescription: null,
  incidentDate: null,
  summary: "Roof claim",
  evidenceTimeline: [],
  documentsToGather: [],
  claimMemo: "Memo",
  totalRecords: 0,
};

describe("insurance claim package storage ownership", () => {
  beforeEach(() => {
    mockEq.mockClear();
    mockAnd.mockClear();
    mockReturning.mockReset();
    mockWhere.mockReset().mockReturnValue({ returning: mockReturning });
    mockDbDelete.mockReset().mockReturnValue({ where: mockWhere });
  });

  it("MemStorage deletes only when package, house, and homeowner all match", async () => {
    const storage = new MemStorage();
    const saved = await storage.saveInsuranceClaimPackage(packageRecord as any);

    expect(await storage.deleteInsuranceClaimPackage(saved.id, "wrong-house", packageRecord.homeownerId)).toBe(false);
    expect(await storage.deleteInsuranceClaimPackage(saved.id, packageRecord.houseId, "wrong-homeowner")).toBe(false);
    expect(await storage.getInsuranceClaimPackage(saved.id, packageRecord.homeownerId)).toBeDefined();

    expect(await storage.deleteInsuranceClaimPackage(saved.id, packageRecord.houseId, packageRecord.homeownerId)).toBe(true);
    expect(await storage.getInsuranceClaimPackage(saved.id, packageRecord.homeownerId)).toBeUndefined();
  });

  it("DbStorage performs one atomic delete scoped by all three identifiers", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "package-owner" }]);
    const storage = new DbStorage();

    const deleted = await storage.deleteInsuranceClaimPackage(
      "package-owner",
      "house-owner",
      "homeowner-owner",
    );

    expect(deleted).toBe(true);
    expect(mockDbDelete).toHaveBeenCalledOnce();
    expect(mockEq.mock.calls.map((call) => call[1])).toEqual([
      "package-owner",
      "house-owner",
      "homeowner-owner",
    ]);
    expect(mockAnd).toHaveBeenCalledOnce();
    expect(mockReturning).toHaveBeenCalledOnce();
  });

  it("DbStorage reports not found when the scoped delete matches no row", async () => {
    mockReturning.mockResolvedValueOnce([]);
    const storage = new DbStorage();

    expect(await storage.deleteInsuranceClaimPackage(
      "missing-package",
      "house-owner",
      "homeowner-owner",
    )).toBe(false);
  });
});