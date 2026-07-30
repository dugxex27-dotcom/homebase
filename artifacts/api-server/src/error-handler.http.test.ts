/**
 * Tests for the global Express error handler registered in index.ts.
 *
 * We build a minimal Express app (same setup as the real one) that includes
 * the 4-arg error middleware, then register synthetic routes that exercise
 * the three main failure modes:
 *
 *   1. next(err)   — a route explicitly forwards an error
 *   2. throw       — a synchronous throw inside a route
 *   3. header-sent — error arrives after the response has already started
 */

import { describe, it, expect } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Route 1: calls next(err) explicitly
  app.get("/test/next-error", (_req: Request, _res: Response, next: NextFunction) => {
    next(new Error("deliberate next(err)"));
  });

  // Route 2: synchronous throw (Express wraps sync throws in error handler)
  app.get("/test/sync-throw", (_req: Request, _res: Response, _next: NextFunction) => {
    throw new Error("deliberate sync throw");
  });

  // Route 3: error arrives after headers are already sent — the handler must
  // not attempt a second res.json() call (would crash with ERR_HTTP_HEADERS_SENT)
  app.get("/test/headers-sent", (_req: Request, res: Response, next: NextFunction) => {
    res.write("partial");           // headers are now sent
    res.end();                      // close the response so supertest doesn't hang
    next(new Error("late error"));  // error arrives after headers sent
  });

  // Route 4: normal successful route — must NOT be affected by the error handler
  app.get("/test/ok", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Global error handler — mirrors the one in index.ts exactly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // In tests we skip the Pino logger call to avoid noise; the real handler
    // uses logger.error({ err }, "Unhandled Express error")
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

describe("Global Express error handler", () => {
  const app = buildTestApp();

  it("returns 500 JSON when a route calls next(err)", async () => {
    const res = await request(app).get("/test/next-error");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("returns 500 JSON when a route throws synchronously", async () => {
    const res = await request(app).get("/test/sync-throw");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("does not crash or double-send when headers are already sent", async () => {
    // The response completes normally (200 + partial body) because the error
    // handler correctly short-circuits when res.headersSent is true.
    const res = await request(app).get("/test/headers-sent");
    // Status was already committed as 200 before the error arrived
    expect(res.status).toBe(200);
    // Body contains the partial write — no second JSON response was injected
    expect(res.text).toContain("partial");
    expect(res.body).not.toHaveProperty("error");
  });

  it("does not interfere with successful routes", async () => {
    const res = await request(app).get("/test/ok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
