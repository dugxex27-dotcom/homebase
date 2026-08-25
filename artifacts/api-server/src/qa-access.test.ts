import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: { getUser },
}));

vi.mock("./db", () => ({
  db: {},
}));

import {
  blockQaOperationalMutations,
  getAuthenticatedDatabaseUserId,
  requireQaAdminReadOnly,
} from "./qa-access";

function responseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("QA access isolation", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("resolves the persisted user ID from a Passport OIDC request", () => {
    const id = getAuthenticatedDatabaseUserId({
      isAuthenticated: () => true,
      user: { id: "qa-oidc-user", claims: { sub: "provider-subject" } },
    });

    expect(id).toBe("qa-oidc-user");
  });

  it("blocks an operational mutation before a Passport QA user refreshes their session", async () => {
    getUser.mockResolvedValue({
      id: "qa-oidc-user",
      isQaAccount: true,
      qaAccessScopes: ["admin_readonly"],
    });
    const res = responseMock();
    const next = vi.fn();

    await blockQaOperationalMutations(
      {
        method: "POST",
        path: "/push/subscribe",
        isAuthenticated: () => true,
        user: { id: "qa-oidc-user" },
      } as any,
      res as any,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "QA_READ_ONLY_ACCOUNT" }));
  });

  it("allows QA analytics capture while keeping the QA admin guard read-only", async () => {
    getUser.mockResolvedValue({
      id: "qa-user",
      isQaAccount: true,
      qaAccessScopes: ["admin_readonly"],
    });
    const mutationRes = responseMock();
    const mutationNext = vi.fn();

    await blockQaOperationalMutations(
      {
        method: "POST",
        path: "/analytics/search",
        session: { isAuthenticated: true, user: { id: "qa-user" } },
      } as any,
      mutationRes as any,
      mutationNext,
    );
    expect(mutationNext).toHaveBeenCalledOnce();

    const adminRes = responseMock();
    const adminNext = vi.fn();
    await requireQaAdminReadOnly(
      {
        method: "POST",
        session: { isAuthenticated: true, user: { id: "qa-user" } },
      } as any,
      adminRes as any,
      adminNext,
    );
    expect(adminNext).not.toHaveBeenCalled();
    expect(adminRes.status).toHaveBeenCalledWith(405);
  });
});