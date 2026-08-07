import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./db", () => ({
  db: {},
  pool: {},
}));

vi.mock("./lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { MemStorage } from "./storage";

describe("MemStorage.transferHouseOwnership", () => {
  let storage: MemStorage;

  const ownerA = "homeowner-a";
  const ownerB = "homeowner-b";

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("transfers task completions from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "123 Main St",
      isDefault: true,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-1",
      taskType: "seasonal",
      taskTitle: "Change HVAC filter",
      month: 5,
      year: 2026,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-2",
      taskType: "annual",
      taskTitle: "Inspect roof",
      month: 5,
      year: 2026,
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(2);

    const completionsForB = await storage.getTaskCompletions(ownerB, house.id);
    expect(completionsForB).toHaveLength(2);
    completionsForB.forEach((c) => {
      expect(c.homeownerId).toBe(ownerB);
      expect(c.houseId).toBe(house.id);
    });

    const completionsForA = await storage.getTaskCompletions(ownerA, house.id);
    expect(completionsForA).toHaveLength(0);
  });

  it("transfers task overrides from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "456 Oak Ave",
      isDefault: false,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "seasonal-hvac",
      isEnabled: false,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "annual-roof",
      isEnabled: true,
      notes: "Custom note",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskOverridesTransferred).toBe(2);

    const overridesForB = await storage.getTaskOverrides(ownerB, house.id);
    expect(overridesForB).toHaveLength(2);
    overridesForB.forEach((o) => {
      expect(o.homeownerId).toBe(ownerB);
      expect(o.houseId).toBe(house.id);
    });

    const overridesForA = await storage.getTaskOverrides(ownerA, house.id);
    expect(overridesForA).toHaveLength(0);
  });

  it("transfers both task completions and task overrides in a single call", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "789 Pine Rd",
      isDefault: false,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-3",
      taskType: "monthly",
      taskTitle: "Test smoke detectors",
      month: 4,
      year: 2026,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-3",
      isEnabled: true,
      frequencyType: "monthly",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(1);
    expect(result.taskOverridesTransferred).toBe(1);

    const completionsForB = await storage.getTaskCompletions(ownerB, house.id);
    expect(completionsForB).toHaveLength(1);
    expect(completionsForB[0].homeownerId).toBe(ownerB);

    const overridesForB = await storage.getTaskOverrides(ownerB, house.id);
    expect(overridesForB).toHaveLength(1);
    expect(overridesForB[0].homeownerId).toBe(ownerB);
  });

  it("only transfers records belonging to the specified house", async () => {
    const houseToTransfer = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "10 Transfer St",
      isDefault: false,
    });

    const otherHouse = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "20 Other St",
      isDefault: false,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: houseToTransfer.id,
      taskId: "task-transfer",
      taskType: "seasonal",
      taskTitle: "Should transfer",
      month: 5,
      year: 2026,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: otherHouse.id,
      taskId: "task-stay",
      taskType: "annual",
      taskTitle: "Should stay",
      month: 5,
      year: 2026,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: houseToTransfer.id,
      taskId: "task-transfer",
      isEnabled: true,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: otherHouse.id,
      taskId: "task-stay",
      isEnabled: false,
    });

    const result = await storage.transferHouseOwnership(houseToTransfer.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(1);
    expect(result.taskOverridesTransferred).toBe(1);

    const completionsForB = await storage.getTaskCompletions(ownerB, houseToTransfer.id);
    expect(completionsForB).toHaveLength(1);

    const remainingForA = await storage.getTaskCompletions(ownerA, otherHouse.id);
    expect(remainingForA).toHaveLength(1);
    expect(remainingForA[0].homeownerId).toBe(ownerA);

    const overridesStillWithA = await storage.getTaskOverrides(ownerA, otherHouse.id);
    expect(overridesStillWithA).toHaveLength(1);
    expect(overridesStillWithA[0].homeownerId).toBe(ownerA);
  });

  it("returns zero counts when there are no task completions or overrides", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "Empty House Lane",
      isDefault: false,
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(0);
    expect(result.taskOverridesTransferred).toBe(0);
  });

  it("throws when the house does not belong to homeowner A", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "Wrong Owner St",
      isDefault: false,
    });

    await expect(
      storage.transferHouseOwnership(house.id, "wrong-owner", ownerB)
    ).rejects.toThrow("House not found or ownership mismatch");
  });

  it("transfers crm_invoices linked to the house from owner A to owner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "999 Invoice Ave",
      isDefault: false,
    });

    const otherHouse = await storage.createHouse({
      homeownerId: ownerA,
      name: "Other House",
      climateZone: "mixed",
      homeSystems: [],
      address: "888 Other Ave",
      isDefault: false,
    });

    // Invoice linked to the house being transferred
    const linkedInvoice = await storage.createCrmInvoice({
      contractorUserId: "contractor-1",
      clientId: "client-1",
      invoiceNumber: "INV-2026-0001",
      title: "HVAC Service",
      subtotal: "250.00",
      total: "250.00",
      amountDue: "250.00",
      lineItems: [],
      homeownerId: ownerA,
      houseId: house.id,
    });

    // Invoice linked to another house — must NOT transfer
    const unlinkedInvoice = await storage.createCrmInvoice({
      contractorUserId: "contractor-1",
      clientId: "client-1",
      invoiceNumber: "INV-2026-0002",
      title: "Plumbing Service",
      subtotal: "150.00",
      total: "150.00",
      amountDue: "150.00",
      lineItems: [],
      homeownerId: ownerA,
      houseId: otherHouse.id,
    });

    // Invoice with no houseId — must NOT transfer
    await storage.createCrmInvoice({
      contractorUserId: "contractor-1",
      clientId: "client-1",
      invoiceNumber: "INV-2026-0003",
      title: "Misc Service",
      subtotal: "100.00",
      total: "100.00",
      amountDue: "100.00",
      lineItems: [],
      homeownerId: ownerA,
      houseId: null,
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.crmInvoicesTransferred).toBe(1);

    // New owner sees the invoice
    const invoicesForB = await storage.getLinkedInvoicesForHomeowner(ownerB);
    expect(invoicesForB.some((i) => i.id === linkedInvoice.id)).toBe(true);
    expect(invoicesForB.every((i) => i.homeownerId === ownerB)).toBe(true);

    // Old owner no longer sees the transferred invoice
    const invoicesForA = await storage.getLinkedInvoicesForHomeowner(ownerA);
    expect(invoicesForA.some((i) => i.id === linkedInvoice.id)).toBe(false);

    // Unlinked invoice (other house) stays with owner A
    expect(invoicesForA.some((i) => i.id === unlinkedInvoice.id)).toBe(true);
  });

  it("clears paymentToken and paymentTokenExpiresAt on transferred invoices so old payment links become invalid", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Token Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "123 Token St",
      isDefault: false,
    });

    // Create an invoice with an active payment token
    const invoice = await storage.createCrmInvoice({
      contractorUserId: "contractor-1",
      clientId: "client-1",
      invoiceNumber: "INV-TOKEN-001",
      title: "Roofing Service",
      subtotal: "500.00",
      total: "500.00",
      amountDue: "500.00",
      lineItems: [],
      homeownerId: ownerA,
      houseId: house.id,
    });

    // Simulate a payment token having been issued before transfer
    const futureExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await storage.updateCrmInvoice(invoice.id, {
      paymentToken: "abc123hash",
      paymentTokenExpiresAt: futureExpiry,
    });

    // Verify the token is set before transfer
    const before = await storage.getCrmInvoice(invoice.id);
    expect(before?.paymentToken).toBe("abc123hash");
    expect(before?.paymentTokenExpiresAt).not.toBeNull();

    await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    // Token must be cleared after transfer so the old owner's link no longer works
    const after = await storage.getCrmInvoice(invoice.id);
    expect(after?.homeownerId).toBe(ownerB);
    expect(after?.paymentToken).toBeNull();
    expect(after?.paymentTokenExpiresAt).toBeNull();
  });

  it("returns crmInvoicesTransferred=0 and invoiceAnalysesTransferred=0 when there is nothing to transfer", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Empty House",
      climateZone: "mixed",
      homeSystems: [],
      address: "0 Empty St",
      isDefault: false,
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.crmInvoicesTransferred).toBe(0);
    expect(result.invoiceAnalysesTransferred).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// MemStorage.expireStaleBoosts
// ---------------------------------------------------------------------------

describe("MemStorage.expireStaleBoosts", () => {
  let storage: MemStorage;

  const CONTRACTOR_ID = "contractor-expiry-001";

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("flips status and isActive only on the boost whose endDate has passed", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const pastDateStr = pastDate.toISOString().split("T")[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const expiredBoost = await storage.createContractorBoost({
      contractorId: CONTRACTOR_ID,
      serviceCategory: "plumbing",
      businessAddress: "123 Expired St",
      businessLatitude: "39.7817",
      businessLongitude: "-89.6501",
      boostRadius: 25,
      startDate: new Date("2026-01-01"),
      endDate: new Date(pastDateStr),
      amount: "49.99",
      status: "active",
      isActive: true,
      stripePaymentIntentId: "pi_expired_test",
    });

    const activeBoost = await storage.createContractorBoost({
      contractorId: CONTRACTOR_ID,
      serviceCategory: "hvac",
      businessAddress: "456 Active Ave",
      businessLatitude: "39.7817",
      businessLongitude: "-89.6501",
      boostRadius: 25,
      startDate: new Date(new Date().toISOString().split("T")[0]),
      endDate: new Date(futureDateStr),
      amount: "49.99",
      status: "active",
      isActive: true,
      stripePaymentIntentId: "pi_active_test",
    });

    const { expired } = await storage.expireStaleBoosts();

    expect(expired).toBe(1);

    const allBoosts = await storage.getContractorBoosts(CONTRACTOR_ID);
    const flipped = allBoosts.find((b) => b.id === expiredBoost.id);
    const untouched = allBoosts.find((b) => b.id === activeBoost.id);

    expect(flipped?.status).toBe("expired");
    expect(flipped?.isActive).toBe(false);

    expect(untouched?.status).toBe("active");
    expect(untouched?.isActive).toBe(true);
  });

  it("returns expired: 0 when no boosts have a past endDate", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    await storage.createContractorBoost({
      contractorId: CONTRACTOR_ID,
      serviceCategory: "plumbing",
      businessAddress: "123 Future St",
      businessLatitude: "39.7817",
      businessLongitude: "-89.6501",
      boostRadius: 25,
      startDate: new Date(new Date().toISOString().split("T")[0]),
      endDate: new Date(futureDateStr),
      amount: "49.99",
      status: "active",
      isActive: true,
      stripePaymentIntentId: "pi_future_test",
    });

    const { expired } = await storage.expireStaleBoosts();

    expect(expired).toBe(0);
  });

  it("does not re-expire a boost that is already status=expired", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const pastDateStr = pastDate.toISOString().split("T")[0];

    await storage.createContractorBoost({
      contractorId: CONTRACTOR_ID,
      serviceCategory: "plumbing",
      businessAddress: "123 Already Expired St",
      businessLatitude: "39.7817",
      businessLongitude: "-89.6501",
      boostRadius: 25,
      startDate: new Date("2026-01-01"),
      endDate: new Date(pastDateStr),
      amount: "49.99",
      status: "expired",
      isActive: false,
      stripePaymentIntentId: "pi_already_expired_test",
    });

    const { expired } = await storage.expireStaleBoosts();

    expect(expired).toBe(0);
  });
});
