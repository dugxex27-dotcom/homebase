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

describe("MemStorage CRM invoice history", () => {
  it("records amount, due date, status, and payment changes chronologically", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-11T12:00:00Z"));
      const storage = new MemStorage();
      const invoice = await storage.createCrmInvoice({
        contractorUserId: "contractor-history",
        clientId: "client-history",
        invoiceNumber: "INV-2026-0001",
        title: "HVAC service",
        subtotal: "100.00",
        total: "100.00",
        amountDue: "100.00",
        lineItems: [],
      });

      vi.setSystemTime(new Date("2026-09-11T12:01:00Z"));
      await storage.updateCrmInvoice(invoice.id, { total: "125.00", amountDue: "125.00" });
      vi.setSystemTime(new Date("2026-09-11T12:02:00Z"));
      await storage.updateCrmInvoice(invoice.id, { dueDate: new Date("2026-10-01T12:00:00Z") });
      vi.setSystemTime(new Date("2026-09-11T12:03:00Z"));
      await storage.updateCrmInvoice(invoice.id, { status: "sent" });
      vi.setSystemTime(new Date("2026-09-11T12:04:00Z"));
      await storage.markCrmInvoicePaidIfUnpaid(invoice.id, {
        amountPaid: "125.00",
        amountDue: "0.00",
      });

      const events = await storage.getCrmInvoiceEvents(invoice.id);
      expect(events.map(({ field }) => field)).toEqual([
        "Amount",
        "Due date",
        "Status",
        "Status",
        "Payment recorded",
      ]);
      expect(events.map(({ createdAt }) => createdAt.toISOString())).toEqual([
        "2026-09-11T12:01:00.000Z",
        "2026-09-11T12:02:00.000Z",
        "2026-09-11T12:03:00.000Z",
        "2026-09-11T12:04:00.000Z",
        "2026-09-11T12:04:00.000Z",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores unchanged values and unrelated fields", async () => {
    const storage = new MemStorage();
    const invoice = await storage.createCrmInvoice({
      contractorUserId: "contractor-history",
      clientId: "client-history",
      invoiceNumber: "INV-2026-0002",
      title: "Plumbing service",
      description: "Original details",
      subtotal: "80.00",
      total: "80.00",
      amountDue: "80.00",
      lineItems: [],
    });

    await storage.updateCrmInvoice(invoice.id, {
      title: invoice.title,
      total: invoice.total,
      dueDate: invoice.dueDate,
      status: invoice.status,
      amountPaid: invoice.amountPaid,
      description: "Updated details",
      notes: "Internal note",
    });

    expect(await storage.getCrmInvoiceEvents(invoice.id)).toEqual([]);
  });
});

describe("MemStorage.createContractorBoost payment idempotency", () => {
  it("returns one boost when webhook and browser paths create the same payment concurrently", async () => {
    const storage = new MemStorage();
    const boostData = {
      contractorId: "contractor-race",
      serviceCategory: "plumbing",
      businessAddress: "1 Test St",
      businessLatitude: "39.78170000",
      businessLongitude: "-89.65010000",
      boostRadius: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: "49.00",
      stripePaymentIntentId: "pi_shared_webhook_browser",
      status: "active",
      isActive: true,
    };

    const [fromWebhook, fromBrowser] = await Promise.all([
      storage.createContractorBoost(boostData),
      storage.createContractorBoost(boostData),
    ]);

    expect(fromWebhook.id).toBe(fromBrowser.id);
    expect(await storage.getContractorBoosts("contractor-race")).toHaveLength(1);
  });
});

describe("MemStorage.transferHouseOwnership", () => {
  let storage: MemStorage;

  const ownerA = "homeowner-a";
  const ownerB = "homeowner-b";

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("transfers maintenance logs from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Maintenance Log House",
      climateZone: "mixed",
      homeSystems: [],
      address: "1 Maintenance Way",
      isDefault: false,
    });

    await storage.createMaintenanceLog({
      homeownerId: ownerA,
      houseId: house.id,
      serviceDate: "2026-08-01",
      serviceType: "HVAC service",
    });
    await storage.createMaintenanceLog({
      homeownerId: ownerA,
      houseId: house.id,
      serviceDate: "2026-08-15",
      serviceType: "Roof inspection",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.maintenanceLogsTransferred).toBe(2);
    const recordsForB = await storage.getMaintenanceLogs(ownerB, house.id);
    expect(recordsForB).toHaveLength(2);
    recordsForB.forEach((record) => expect(record.homeownerId).toBe(ownerB));
    expect(await storage.getMaintenanceLogs(ownerA, house.id)).toHaveLength(0);
  });

  it("transfers home appliances from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Appliance House",
      climateZone: "mixed",
      homeSystems: [],
      address: "2 Appliance Way",
      isDefault: false,
    });

    await storage.createHomeAppliance({
      homeownerId: ownerA,
      houseId: house.id,
      name: "Kitchen Dishwasher",
      make: "Test Make",
      model: "DW-1",
    });
    await storage.createHomeAppliance({
      homeownerId: ownerA,
      houseId: house.id,
      name: "Water Heater",
      make: "Test Make",
      model: "WH-1",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.appliancesTransferred).toBe(2);
    const recordsForB = await storage.getHomeAppliances(ownerB, house.id);
    expect(recordsForB).toHaveLength(2);
    recordsForB.forEach((record) => expect(record.homeownerId).toBe(ownerB));
    expect(await storage.getHomeAppliances(ownerA, house.id)).toHaveLength(0);
  });

  it("transfers contractor appointments from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Appointment House",
      climateZone: "mixed",
      homeSystems: [],
      address: "3 Appointment Way",
      isDefault: false,
    });

    await storage.createContractorAppointment({
      homeownerId: ownerA,
      houseId: house.id,
      contractorName: "Test Contractor",
      serviceType: "Plumbing",
      serviceDescription: "Inspect water heater",
      homeArea: "Basement",
      scheduledDateTime: "2026-09-10T10:00:00.000Z",
    });
    await storage.createContractorAppointment({
      homeownerId: ownerA,
      houseId: house.id,
      contractorName: "Test Contractor",
      serviceType: "Electrical",
      serviceDescription: "Inspect panel",
      homeArea: "Garage",
      scheduledDateTime: "2026-09-11T10:00:00.000Z",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.appointmentsTransferred).toBe(2);
    const recordsForB = await storage.getContractorAppointments(ownerB, house.id);
    expect(recordsForB).toHaveLength(2);
    recordsForB.forEach((record) => expect(record.homeownerId).toBe(ownerB));
    expect(await storage.getContractorAppointments(ownerA, house.id)).toHaveLength(0);
  });

  it("transfers custom maintenance tasks from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Custom Task House",
      climateZone: "mixed",
      homeSystems: [],
      address: "4 Custom Task Way",
      isDefault: false,
    });

    await storage.createCustomMaintenanceTask({
      homeownerId: ownerA,
      houseId: house.id,
      title: "Flush water heater",
      category: "plumbing",
      frequencyType: "annually",
    });
    await storage.createCustomMaintenanceTask({
      homeownerId: ownerA,
      houseId: house.id,
      title: "Clean dryer vent",
      category: "appliances",
      frequencyType: "annually",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.customTasksTransferred).toBe(2);
    const recordsForB = await storage.getCustomMaintenanceTasks(ownerB, house.id);
    expect(recordsForB).toHaveLength(2);
    recordsForB.forEach((record) => expect(record.homeownerId).toBe(ownerB));
    expect(await storage.getCustomMaintenanceTasks(ownerA, house.id)).toHaveLength(0);
  });

  it("transfers home systems from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      name: "Home System House",
      climateZone: "mixed",
      homeSystems: [],
      address: "5 Home System Way",
      isDefault: false,
    });

    await storage.createHomeSystem({
      homeownerId: ownerA,
      houseId: house.id,
      systemType: "Central Air",
    });
    await storage.createHomeSystem({
      homeownerId: ownerA,
      houseId: house.id,
      systemType: "Gas Heat",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.homeSystemsTransferred).toBe(2);
    const recordsForB = await storage.getHomeSystems(ownerB, house.id);
    expect(recordsForB).toHaveLength(2);
    recordsForB.forEach((record) => expect(record.homeownerId).toBe(ownerB));
    expect(await storage.getHomeSystems(ownerA, house.id)).toHaveLength(0);
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

  it("deletes boosts only after the 30-day audit grace period", async () => {
    const oldEndDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const recentEndDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

    const oldBoost = await storage.createContractorBoost({
      contractorId: CONTRACTOR_ID,
      serviceCategory: "plumbing",
      businessAddress: "123 Old Boost St",
      businessLatitude: "39.7817",
      businessLongitude: "-89.6501",
      boostRadius: 25,
      startDate: new Date("2026-01-01"),
      endDate: oldEndDate,
      amount: "49.99",
      status: "expired",
      isActive: false,
    });
    const recentBoost = await storage.createContractorBoost({
      contractorId: CONTRACTOR_ID,
      serviceCategory: "hvac",
      businessAddress: "456 Recent Boost Ave",
      businessLatitude: "39.7817",
      businessLongitude: "-89.6501",
      boostRadius: 25,
      startDate: new Date("2026-01-01"),
      endDate: recentEndDate,
      amount: "49.99",
      status: "expired",
      isActive: false,
    });

    const { deleted } = await storage.expireStaleBoosts();
    const remaining = await storage.getContractorBoosts(CONTRACTOR_ID);

    expect(deleted).toBe(1);
    expect(remaining.some((boost) => boost.id === oldBoost.id)).toBe(false);
    expect(remaining.some((boost) => boost.id === recentBoost.id)).toBe(true);
  });
});
