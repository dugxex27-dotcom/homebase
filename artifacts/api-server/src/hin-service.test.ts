import { vi, describe, it, expect, beforeEach } from "vitest";

const insertedValues: Record<string, unknown>[] = [];

vi.mock("./db", () => {
  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    limit: async () => [] as unknown[],
  };

  const insertChain = {
    values: (vals: Record<string, unknown>) => {
      insertedValues.push(vals);
      return insertChain;
    },
    onConflictDoNothing: () => insertChain,
    returning: async () => [
      {
        hin: "HU91100AACEFGH3",
        normalizedAddress: "normalized",
        city: "city",
        state: "state",
        zip: "zip",
        createdAt: new Date(),
      },
    ],
  };

  return {
    db: {
      select: () => selectChain,
      insert: () => insertChain,
    },
  };
});

import { getOrCreateHINForCombinedAddress } from "./hin-service";

describe("getOrCreateHINForCombinedAddress", () => {
  beforeEach(() => {
    insertedValues.length = 0;
  });

  it("passes a unit extracted from the combined address through to the inserted HIN row", async () => {
    await getOrCreateHINForCombinedAddress("789 Main St Apt 12, Seattle, WA 98101");

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0].unit).toBe("APT 12");
    expect(insertedValues[0].streetName).not.toContain("APT");
  });

  it("prefers an explicit options.unit over one inferred from the address string", async () => {
    await getOrCreateHINForCombinedAddress("789 Main St Apt 12, Seattle, WA 98101", {
      unit: "Unit 99",
    });

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0].unit).toBe("UNIT 99");
  });

  it("writes an empty unit when the address has no apartment/unit/suite token", async () => {
    await getOrCreateHINForCombinedAddress("2847 Maple Drive, Seattle, WA 98101");

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0].unit).toBe("");
  });

  it("extracts a unit from a verbose address with a full state name and separate zip", async () => {
    await getOrCreateHINForCombinedAddress("789 Main St, Apt 12, Seattle, Washington, 98101");

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0].unit).toBe("APT 12");
  });
});
