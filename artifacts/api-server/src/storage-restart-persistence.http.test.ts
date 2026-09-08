import express, { type Express } from "express";
import request from "supertest";
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  companies,
  companyInviteCodes,
  countries,
  regionalMaintenanceTasks,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { db } from "./db";
import type { IStorage } from "./storage";

/**
 * A deliberately small HTTP harness for persistence integration tests.
 *
 * Rebuilding both this app and DbStorage models a process restart: no object
 * or Map from the writer process is reused by the reader process. The real
 * database and real storage implementations remain in use.
 */
type PersistenceStorage = Pick<
  IStorage,
  | "createCompanyInviteCode"
  | "getCompanyInviteCodeByCode"
  | "createRegionalMaintenanceTask"
  | "getRegionalMaintenanceTask"
>;

function buildPersistenceApi(storage: PersistenceStorage): Express {
  const app = express();
  app.use(express.json());

  app.post("/api/companies/:companyId/invite-codes", async (req, res) => {
    const invite = await storage.createCompanyInviteCode({
      companyId: req.params.companyId,
      code: req.body.code,
      createdBy: req.body.createdBy,
    });
    res.status(201).json(invite);
  });

  app.get("/api/companies/invite-codes/:code", async (req, res) => {
    const invite = await storage.getCompanyInviteCodeByCode(req.params.code);
    if (!invite) {
      res.status(404).json({ message: "Invite code not found" });
      return;
    }
    res.json(invite);
  });

  app.post("/api/maintenance-tasks/regional", async (req, res) => {
    const task = await storage.createRegionalMaintenanceTask(req.body);
    res.status(201).json(task);
  });

  app.get("/api/maintenance-tasks/regional/:id", async (req, res) => {
    const task = await storage.getRegionalMaintenanceTask(req.params.id);
    if (!task) {
      res.status(404).json({ message: "Regional maintenance task not found" });
      return;
    }
    res.json(task);
  });

  return app;
}

describe.sequential("database records survive a server restart", () => {
  const suffix = randomUUID();
  const companyId = randomUUID();
  const inviteCode = `RST${suffix.replaceAll("-", "").slice(0, 12)}`.toUpperCase();
  let countryId: string;
  let regionalTaskId: string;
  let DbStorage: typeof import("./storage").DbStorage;

  beforeAll(async () => {
    process.env.DISABLE_DEMO_DATA = "true";
    ({ DbStorage } = await import("./storage"));

    const [country] = await db.select({ id: countries.id }).from(countries).limit(1);
    if (!country) {
      throw new Error("Persistence test requires at least one seeded country");
    }
    countryId = country.id;

    await db.insert(companies).values({
      id: companyId,
      name: `Restart Test Company ${suffix}`,
      bio: "Persistence integration fixture",
      experience: 1,
      location: "Test Region",
      ownerId: `restart-owner-${suffix}`,
      services: ["HVAC"],
      phone: "555-0100",
      email: `restart-${suffix}@example.test`,
      licenseNumber: `LIC-${suffix}`,
      licenseMunicipality: "Test Region",
    });
  });

  afterAll(async () => {
    await db.delete(companyInviteCodes).where(eq(companyInviteCodes.companyId, companyId));
    await db.delete(regionalMaintenanceTasks).where(eq(regionalMaintenanceTasks.countryId, countryId));
    await db.delete(companies).where(eq(companies.id, companyId));
  });

  it("keeps company invite codes after storage and HTTP app recreation", async () => {
    const writerApi = buildPersistenceApi(new DbStorage());
    const write = await request(writerApi)
      .post(`/api/companies/${companyId}/invite-codes`)
      .send({ code: inviteCode, createdBy: `restart-owner-${suffix}` });

    expect(write.status).toBe(201);
    expect(write.body.code).toBe(inviteCode);

    // Simulated restart: reader shares no in-memory storage or Express state.
    const restartedApi = buildPersistenceApi(new DbStorage());
    const read = await request(restartedApi).get(
      `/api/companies/invite-codes/${inviteCode}`,
    );

    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({
      id: write.body.id,
      companyId,
      code: inviteCode,
      createdBy: `restart-owner-${suffix}`,
      isActive: true,
    });
  });

  it("keeps regional maintenance tasks after storage and HTTP app recreation", async () => {
    const writerApi = buildPersistenceApi(new DbStorage());
    const write = await request(writerApi)
      .post("/api/maintenance-tasks/regional")
      .send({
        countryId,
        taskId: `restart-task-${suffix}`,
        title: "Inspect restart persistence",
        description: "Confirm this regional task remains after process state is discarded.",
        category: "HVAC",
        priority: "high",
        months: ["1", "9"],
        tools: ["flashlight"],
      });

    expect(write.status).toBe(201);
    regionalTaskId = write.body.id;

    // Simulated restart: reader shares no in-memory storage or Express state.
    const restartedApi = buildPersistenceApi(new DbStorage());
    const read = await request(restartedApi).get(
      `/api/maintenance-tasks/regional/${regionalTaskId}`,
    );

    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({
      id: regionalTaskId,
      countryId,
      taskId: `restart-task-${suffix}`,
      title: "Inspect restart persistence",
      category: "HVAC",
      priority: "high",
      months: ["1", "9"],
      tools: ["flashlight"],
      isActive: true,
    });
  });
});