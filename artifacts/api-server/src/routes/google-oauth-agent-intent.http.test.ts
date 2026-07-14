/**
 * HTTP-level integration tests for the /auth/google/callback agent-intent branch.
 *
 * These tests confirm that the oauthIntent stored in the session before the Google
 * redirect is correctly consumed after the callback — covering all branching paths
 * specific to the agent sign-up flow.
 *
 * Cases covered:
 *   1. New user (no zipCode)                → /complete-profile?intent=agent
 *   2. Existing homeowner (has zipCode)     → role upgraded; /agent-dashboard
 *   3. Existing agent (has zipCode)         → /agent-dashboard (no upsert)
 *   4. Auth failure (passport error)        → /signin
 *
 * Strategy
 * ────────
 * passport is fully mocked so no real Google credentials are needed.
 * passport.authenticate('google', opts) returns a stub middleware that either
 * injects req._testUser into req.user and calls next(), or redirects to the
 * failureRedirect (controlled by req._forceAuthFailure).
 *
 * A pre-middleware installed before setupGoogleAuth configures the session and
 * the injected test user for each scenario.  The session.save() method is
 * replaced with an immediate synchronous callback so the redirect fires inline.
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
 *   1. Injects a controlled session (with oauthIntent='agent') and test user.
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
      oauthIntent: "agent",
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

describe("/auth/google/callback — agent intent routing", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a new user (no zipCode) to /complete-profile?intent=agent", async () => {
    const newUser: UserFixture = {
      id: "google_ag_new001",
      email: "newagent@example.com",
      role: "homeowner",
      zipCode: null,
    };

    const app = await buildApp(newUser);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/complete-profile?intent=agent");
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("upgrades an existing non-agent (has zipCode) to agent and redirects to /agent-dashboard", async () => {
    const homeowner: UserFixture = {
      id: "google_ag_hw001",
      email: "homeowner@example.com",
      role: "homeowner",
      zipCode: "90210",
    };

    const upgraded = { ...homeowner, role: "agent" as const };
    mockUpsertUser.mockResolvedValue(upgraded);

    const app = await buildApp(homeowner);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/agent-dashboard");
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: "agent" }),
    );
  });

  it("redirects an existing agent (has zipCode) to /agent-dashboard without re-upsert", async () => {
    const existingAgent: UserFixture = {
      id: "google_ag001",
      email: "agent@example.com",
      role: "agent",
      zipCode: "90210",
    };

    const app = await buildApp(existingAgent);

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/agent-dashboard");
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("falls back to /signin when passport auth fails (session lost scenario)", async () => {
    const app = await buildApp(null, { forceAuthFailure: true });

    const res = await request(app).get("/auth/google/callback");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/signin");
  });
});
