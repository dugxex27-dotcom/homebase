import { describe, expect, it, vi } from "vitest";
import { buildCrmLeadsUrl, fetchCrmLeads } from "./crm-leads-query";

describe("CRM leads query", () => {
  it("serializes active filters as query parameters instead of a path object", () => {
    expect(buildCrmLeadsUrl({
      status: "new",
      priority: "all",
      source: "website",
      searchQuery: "Jane Doe",
    })).toBe("/api/crm/leads?status=new&source=website&searchQuery=Jane+Doe");
  });

  it("returns every lead from the CRM list response", async () => {
    const leads = [{ id: "lead-1" }, { id: "lead-2" }, { id: "lead-3" }];
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => leads,
    });

    await expect(fetchCrmLeads({}, fetcher as typeof fetch)).resolves.toEqual(leads);
    expect(fetcher).toHaveBeenCalledWith("/api/crm/leads", {
      credentials: "include",
    });
  });

  it("rejects a lead-detail object returned from an invalid list URL", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lead: { id: "lead-1" }, notes: [] }),
    });

    await expect(fetchCrmLeads({}, fetcher as typeof fetch)).rejects.toThrow(
      "Invalid CRM leads response",
    );
  });
});