/**
 * HTTP-level integration tests for the /auth/google/callback default-routing branch.
 *
 * These tests confirm that when no oauthIntent is stored in the session (the common
 * case for homeowners and agents signing in via Google), the callback redirects each
 * user to the correct destination based on their profile state and role.
 *
 * Cases covered:
 *   1. New user (no zipCode), any role     → /complete-profile
 *   2. Existing homeowner (has zipCode)    → /dashboard
 *   3. Existing agent (has zipCode)        → /agent-dashboard
 *   4. Existing contractor (has zipCode)   → /contractor-dashboard
 *   5. Auth failure (passport error)       → /signin
 *
 * Strategy
 * ────────
 * passport is fully mocked so no real Google credentials are needed.
 * A pre-middleware injects a controlled session (no oauthIntent) and test user
 * for each scenario. session.save() is replaced with an immediate callback so
 * the redirect fires inline without async delay.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const { mockUpsertUser } = vi.hoisted(() => ({
  mockUpsertUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks — must come before all imports
// ---------------------------------------------------------------------------

vi.mock("passport", () => {
  const stub = vi.fn().mockReturnValue((req: any, res: any, next: any) => {
    if (req._forceAuthFailure) {
      return res.redirect("/signin");
    }
    req.user = req._testUser ?? null;
    if (!req.user) {
      return res.redirect("/signin");
    }
    next();
  });

  return {
    default: {
      use: vi.fn(),
      serializeUser: vi.fn(),
      deserializeUser: vi.fn(),
      authenticate: stub,
      initialize: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    },
  };
});

vi.mock("passport-google-oauth20", () => ({
  Strategy: class MockGoogleStrategy {
    constructor(_opts: any, _verify: any) {}
  },
}));

vi.mock("../storage", async () => {
  const { createStorageMock } = await import(
    "../test-helpers/storage-mock"
  );
  return {
    storage: createStorageMock({
      upsertUser: mockUpsertUser,
    }),
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { setupGoogleAuth } from "../googleAuth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type UserFixture = {
  id: string;
  email: string;
  role: "homeowner" | "contractor" | "agent";
  zipCode: string | null;
  companyId?: string | null;
  subscriptionStatus?: string | null;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
};

/**
 * Build a minimal Express app that:
 *   1. Injects a controlled session with NO oauthIntent (default routing branch).
 *   2. Registers the Google auth routes via setupGoogleAuth.
 */
async function buildApp(
  testUser: UserFixture | null,
  opts: { forceAuthFailure?: boolean } = {},
): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    req._testUser = testUser;
    req._forceAuthFailure = opts.forceAuthFailure ?? false;

    req.session = {
      // No oauthIntent — exercises the default routing section
      isAuthenticated: false,
      user: null as any,
      save(cb: (err?: any) => void) {
        cb();
      },
    };

    next();
  });

  await setupGoogleAuth(app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/auth/google/callback — default routing (no oauthIntent)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a new user (no zipCode) to /complete-profile", async () => {
    const newUser: UserFixture = {
      id: "google_new001",
      email: "newuser@example.com",
      role: "homeowner",
      zipCode: null,
    };

    const app = await buildApp(newUser);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/complete-profile");
  });

  it("redirects an existing homeowner (has zipCode) to /dashboard", async () => {
    const homeowner: UserFixture = {
      id: "google_hw001",
      email: "homeowner@example.com",
      role: "homeowner",
      zipCode: "90210",
    };

    const app = await buildApp(homeowner);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/dashboard");
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("redirects an existing agent (has zipCode) to /agent-dashboard", async () => {
    const agent: UserFixture = {
      id: "google_ag001",
      email: "agent@example.com",
      role: "agent",
      zipCode: "10001",
    };

    const app = await buildApp(agent);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/agent-dashboard");
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("redirects an existing contractor (has zipCode) to /contractor-dashboard", async () => {
    const contractor: UserFixture = {
      id: "google_ct001",
      email: "contractor@example.com",
      role: "contractor",
      zipCode: "30301",
      companyId: "company-001",
      subscriptionStatus: "active",
    };

    const app = await buildApp(contractor);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/contractor-dashboard");
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("falls back to /signin when passport auth fails", async () => {
    const app = await buildApp(null, { forceAuthFailure: true });

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/signin");
  });
});
