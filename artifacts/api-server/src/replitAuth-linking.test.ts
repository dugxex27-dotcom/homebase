import { vi, describe, it, expect, beforeEach, afterAll } from "vitest";

const {
  mockStrategyConstructor,
  mockGetUser,
  mockGetUserByEmail,
  mockUpsertUser,
} = vi.hoisted(() => ({
  mockStrategyConstructor: vi.fn(),
  mockGetUser: vi.fn(),
  mockGetUserByEmail: vi.fn(),
  mockUpsertUser: vi.fn(),
}));

vi.mock("openid-client", () => ({
  discovery: vi.fn().mockResolvedValue({}),
  refreshTokenGrant: vi.fn(),
  buildEndSessionUrl: vi.fn(),
}));

vi.mock("openid-client/passport", () => ({
  Strategy: class MockOidcStrategy {
    constructor(...args: any[]) {
      mockStrategyConstructor(...args);
    }
  },
}));

vi.mock("passport", () => ({
  default: {
    initialize: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    session: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    authenticate: vi.fn(),
  },
}));

vi.mock("express-session", () => ({
  default: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("connect-pg-simple", () => ({
  default: () => class MockStore {},
}));

vi.mock("memoizee", () => ({
  default: (fn: any) => fn,
}));

vi.mock("../src/db", () => ({
  db: {},
  pool: {},
}));

vi.mock("./storage", () => ({
  storage: {
    getUser: mockGetUser,
    getUserByEmail: mockGetUserByEmail,
    upsertUser: mockUpsertUser,
  },
}));

import express from "express";
import { setupAuth } from "./replitAuth";

type Claims = {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

function makeTokens(claims: Claims): any {
  return {
    claims: () => claims,
    access_token: "access-token",
    refresh_token: "refresh-token",
  };
}

async function getVerifyFunction() {
  const app = express();
  await setupAuth(app);
  const latestStrategyCall =
    mockStrategyConstructor.mock.calls[mockStrategyConstructor.mock.calls.length - 1];
  return latestStrategyCall[1] as (
    tokens: any,
    verified: (error: Error | null, user?: any) => void,
  ) => Promise<void>;
}

async function runVerify(claims: Claims) {
  const verify = await getVerifyFunction();

  return new Promise<{ error: Error | null; user?: any }>((resolve) => {
    void verify(makeTokens(claims), (error, user) => resolve({ error, user }));
  });
}

describe("Replit OIDC account resolution", () => {
  const previousDomains = process.env.REPLIT_DOMAINS;

  beforeEach(() => {
    process.env.REPLIT_DOMAINS = "oidc-test.example";
    mockStrategyConstructor.mockClear();
    mockGetUser.mockReset();
    mockGetUserByEmail.mockReset();
    mockUpsertUser.mockReset();
  });

  afterAll(() => {
    if (previousDomains === undefined) {
      delete process.env.REPLIT_DOMAINS;
    } else {
      process.env.REPLIT_DOMAINS = previousDomains;
    }
  });

  it("links a different OIDC subject to the existing email account", async () => {
    const existingUser = {
      id: "database-user-1",
      email: "existing@example.com",
      role: "contractor",
      companyId: "company-1",
      companyRole: "owner",
      subscriptionStatus: "active",
    };
    mockGetUser.mockResolvedValue(undefined);
    mockGetUserByEmail.mockResolvedValue(existingUser);
    mockUpsertUser.mockResolvedValue(existingUser);

    const result = await runVerify({
      sub: "new-oidc-subject",
      email: " EXISTING@example.com ",
      first_name: "Updated",
      last_name: "Name",
    });

    expect(result.error).toBeNull();
    expect(result.user.id).toBe(existingUser.id);
    expect(mockGetUserByEmail).toHaveBeenCalledWith("existing@example.com");
    expect(mockGetUser).toHaveBeenCalledWith("new-oidc-subject");
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingUser.id,
        email: "existing@example.com",
        role: existingUser.role,
        companyId: existingUser.companyId,
        companyRole: existingUser.companyRole,
      }),
    );
  });

  it("keeps a returning user's existing account when the subject matches", async () => {
    const existingUser = {
      id: "returning-user-1",
      email: "returning@example.com",
      role: "homeowner",
      zipCode: "98101",
      subscriptionStatus: "trialing",
    };
    mockGetUser.mockResolvedValue(existingUser);
    mockGetUserByEmail.mockResolvedValue(existingUser);
    mockUpsertUser.mockResolvedValue(existingUser);

    const result = await runVerify({
      sub: existingUser.id,
      email: existingUser.email,
    });

    expect(result.error).toBeNull();
    expect(result.user.id).toBe(existingUser.id);
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: existingUser.id }),
    );
  });

  it("creates a new account for a new email and subject", async () => {
    const newUser = {
      id: "new-oidc-subject",
      email: "new@example.com",
      role: "homeowner",
    };
    mockGetUser.mockResolvedValue(undefined);
    mockGetUserByEmail.mockResolvedValue(undefined);
    mockUpsertUser.mockResolvedValue(newUser);

    const result = await runVerify({
      sub: newUser.id,
      email: newUser.email,
    });

    expect(result.error).toBeNull();
    expect(result.user.id).toBe(newUser.id);
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: newUser.id,
        email: newUser.email,
        role: "homeowner",
        subscriptionStatus: "trialing",
      }),
    );
  });

  it("rejects an identity conflict instead of merging two different accounts", async () => {
    mockGetUser.mockResolvedValue({
      id: "subject-owned-user",
      email: "subject@example.com",
    });
    mockGetUserByEmail.mockResolvedValue({
      id: "email-owned-user",
      email: "email@example.com",
    });

    const result = await runVerify({
      sub: "subject-owned-user",
      email: "email@example.com",
    });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain("conflicts");
    expect(result.user).toBeUndefined();
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });
});