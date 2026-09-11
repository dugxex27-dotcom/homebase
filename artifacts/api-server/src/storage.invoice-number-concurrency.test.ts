import { beforeEach, describe, expect, it, vi } from "vitest";

const { rows, mockExecute, mockTransaction } = vi.hoisted(() => {
  const invoiceRows: Array<Record<string, any>> = [];
  const execute = vi.fn();
  const transaction = vi.fn();
  return { rows: invoiceRows, mockExecute: execute, mockTransaction: transaction };
});

vi.mock("./db", () => ({
  db: {
    transaction: mockTransaction,
  },
}));

import { DbStorage } from "./storage";

describe("DbStorage.createCrmInvoiceWithGeneratedNumber", () => {
  beforeEach(() => {
    rows.length = 0;
    mockExecute.mockReset();
    mockTransaction.mockReset();

    let lockTail = Promise.resolve();
    mockTransaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const previousLock = lockTail;
      let releaseLock!: () => void;
      lockTail = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      let acquired = false;

      const tx = {
        execute: mockExecute.mockImplementationOnce(async () => {
          await previousLock;
          acquired = true;
        }),
        select: () => ({
          from: () => ({
            where: async () => rows.map(({ invoiceNumber }) => ({ invoiceNumber })),
          }),
        }),
        insert: () => ({
          values: (invoice: Record<string, any>) => ({
            returning: async () => {
              await Promise.resolve();
              const created = { id: `invoice-${rows.length + 1}`, ...invoice };
              rows.push(created);
              return [created];
            },
          }),
        }),
      };

      try {
        return await callback(tx);
      } finally {
        if (!acquired) await previousLock;
        releaseLock();
      }
    });
  });

  it("allocates distinct compatible numbers for concurrent company invoices", async () => {
    const storage = Object.create(DbStorage.prototype) as DbStorage;
    const baseInvoice = {
      companyId: "company-atomic-number",
      clientId: "client-1",
      title: "Service",
      subtotal: "100.00",
      total: "100.00",
      amountDue: "100.00",
      lineItems: [],
    };

    const [first, second] = await Promise.all([
      storage.createCrmInvoiceWithGeneratedNumber(
        { ...baseInvoice, contractorUserId: "contractor-a" } as any,
        2026,
      ),
      storage.createCrmInvoiceWithGeneratedNumber(
        { ...baseInvoice, contractorUserId: "contractor-b" } as any,
        2026,
      ),
    ]);

    expect(new Set([first.invoiceNumber, second.invoiceNumber])).toEqual(
      new Set(["INV-2026-0001", "INV-2026-0002"]),
    );
    expect(rows).toHaveLength(2);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("continues after the highest existing number instead of using row count", async () => {
    rows.push(
      { invoiceNumber: "INV-2026-0007" },
      { invoiceNumber: "INV-2025-0042" },
      { invoiceNumber: "legacy-number" },
    );
    const storage = Object.create(DbStorage.prototype) as DbStorage;

    const invoice = await storage.createCrmInvoiceWithGeneratedNumber(
      {
        contractorUserId: "contractor-a",
        companyId: "company-atomic-number",
        clientId: "client-1",
        title: "Service",
        subtotal: "100.00",
        total: "100.00",
        amountDue: "100.00",
        lineItems: [],
      } as any,
      2026,
    );

    expect(invoice.invoiceNumber).toBe("INV-2026-0008");
  });
});