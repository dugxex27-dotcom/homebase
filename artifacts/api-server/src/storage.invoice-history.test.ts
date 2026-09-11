import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTransaction, insertedEvents } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  insertedEvents: [] as Array<Record<string, any>>,
}));

vi.mock("./db", () => ({
  db: {
    transaction: mockTransaction,
  },
}));

import { DbStorage } from "./storage";

describe("DbStorage CRM invoice payment history", () => {
  beforeEach(() => {
    insertedEvents.length = 0;
    mockTransaction.mockReset();
  });

  it("writes status and payment events in the same transaction as payment confirmation", async () => {
    const existing = {
      id: "invoice-payment-history",
      contractorUserId: "contractor-1",
      clientId: "client-1",
      invoiceNumber: "INV-2026-0001",
      title: "HVAC service",
      status: "sent",
      total: "125.00",
      amountPaid: "0.00",
      amountDue: "125.00",
      dueDate: null,
      sentAt: new Date(),
      viewedAt: null,
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [existing],
            }),
          }),
        }),
        update: () => ({
          set: (updates: Record<string, any>) => ({
            where: () => ({
              returning: async () => [{ ...existing, ...updates }],
            }),
          }),
        }),
        insert: () => ({
          values: async (events: Array<Record<string, any>>) => {
            insertedEvents.push(...events);
          },
        }),
      };
      return callback(tx);
    });

    const storage = Object.create(DbStorage.prototype) as DbStorage;
    const result = await storage.markCrmInvoicePaidIfUnpaid(existing.id, {
      amountPaid: "125.00",
      amountDue: "0.00",
    });

    expect(result?.status).toBe("paid");
    expect(insertedEvents.map(({ field }) => field)).toEqual(["Status", "Payment recorded"]);
    expect(insertedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "Status", oldValue: "sent", newValue: "paid" }),
        expect.objectContaining({
          field: "Payment recorded",
          oldValue: "$0.00",
          newValue: "$125.00",
        }),
      ]),
    );
  });
});