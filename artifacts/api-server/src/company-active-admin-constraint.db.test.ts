import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "./db";

const migrationUrl = new URL(
  "../migrations/20260909-company-active-admin-guard.sql",
  import.meta.url,
);
const journalUrl = new URL("../migrations/meta/_journal.json", import.meta.url);

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "company active-admin constraint — real PostgreSQL",
  () => {
    let client: PoolClient;
    let firstConcurrentClient: PoolClient;
    let secondConcurrentClient: PoolClient;
    const schemaName = `company_admin_guard_${randomUUID().replaceAll("-", "")}`;

    beforeAll(async () => {
      client = await pool.connect();
      firstConcurrentClient = await pool.connect();
      secondConcurrentClient = await pool.connect();
      await client.query(`CREATE SCHEMA ${schemaName}`);
      await client.query(`SET search_path TO ${schemaName}`);
      await client.query(`
        CREATE TABLE companies (
          id varchar PRIMARY KEY
        )
      `);
      await client.query(`
        CREATE TABLE users (
          id varchar PRIMARY KEY,
          company_id varchar REFERENCES companies(id) ON DELETE SET NULL,
          company_role text,
          company_status text DEFAULT 'active'
        )
      `);

      const migration = await readFile(migrationUrl, "utf8");
      await client.query(migration);
      await firstConcurrentClient.query(`SET search_path TO ${schemaName}`);
      await secondConcurrentClient.query(`SET search_path TO ${schemaName}`);
    });

    afterAll(async () => {
      await firstConcurrentClient.query("ROLLBACK");
      await secondConcurrentClient.query("ROLLBACK");
      await client.query("RESET search_path");
      await client.query(`DROP SCHEMA ${schemaName} CASCADE`);
      firstConcurrentClient.release();
      secondConcurrentClient.release();
      client.release();
    });

    it("rejects direct SQL that removes the final owner/admin", async () => {
      await client.query("BEGIN");
      await client.query("INSERT INTO companies (id) VALUES ('last-admin-company')");
      await client.query(`
        INSERT INTO users (id, company_id, company_role, company_status)
        VALUES ('last-admin', 'last-admin-company', 'admin', 'active')
      `);
      await client.query("SET CONSTRAINTS company_requires_active_admin IMMEDIATE");
      await client.query("SET CONSTRAINTS company_requires_active_admin DEFERRED");

      await client.query("SAVEPOINT reject_last_admin");
      await client.query(`
        UPDATE users
        SET company_status = 'removed'
        WHERE id = 'last-admin'
      `);

      await expect(
        client.query("SET CONSTRAINTS company_requires_active_admin IMMEDIATE"),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "company_requires_active_admin",
      });
      await client.query("ROLLBACK TO SAVEPOINT reject_last_admin");
      await client.query("COMMIT");
    });

    it("registers the guard in the Drizzle migration journal", async () => {
      const journal = JSON.parse(await readFile(journalUrl, "utf8"));
      expect(journal.entries.at(-1)).toMatchObject({
        idx: 18,
        tag: "20260909-company-active-admin-guard",
      });
    });

    it("allows a direct demotion when another admin remains", async () => {
      await client.query("BEGIN");
      await client.query("INSERT INTO companies (id) VALUES ('two-admin-company')");
      await client.query(`
        INSERT INTO users (id, company_id, company_role, company_status)
        VALUES
          ('first-admin', 'two-admin-company', 'owner', 'active'),
          ('second-admin', 'two-admin-company', 'admin', 'active')
      `);
      await client.query("SET CONSTRAINTS company_requires_active_admin IMMEDIATE");
      await client.query("SET CONSTRAINTS company_requires_active_admin DEFERRED");

      await client.query(`
        UPDATE users
        SET company_role = 'tech'
        WHERE id = 'first-admin'
      `);

      await expect(
        client.query("SET CONSTRAINTS company_requires_active_admin IMMEDIATE"),
      ).resolves.toBeDefined();
      await client.query("COMMIT");
    });

    it("does not count suspended or pending-invite admins as available", async () => {
      await client.query("BEGIN");
      await client.query("INSERT INTO companies (id) VALUES ('unavailable-admin-company')");
      await client.query(`
        INSERT INTO users (id, company_id, company_role, company_status)
        VALUES
          ('available-owner', 'unavailable-admin-company', 'owner', 'active'),
          ('suspended-admin', 'unavailable-admin-company', 'admin', 'suspended'),
          ('invited-admin', 'unavailable-admin-company', 'admin', 'pending_invite')
      `);
      await client.query("SET CONSTRAINTS company_requires_active_admin IMMEDIATE");
      await client.query("SET CONSTRAINTS company_requires_active_admin DEFERRED");
      await client.query("SAVEPOINT reject_unavailable_admins");
      await client.query(`
        UPDATE users
        SET company_status = 'removed'
        WHERE id = 'available-owner'
      `);

      await expect(
        client.query("SET CONSTRAINTS company_requires_active_admin IMMEDIATE"),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "company_requires_active_admin",
      });
      await client.query("ROLLBACK TO SAVEPOINT reject_unavailable_admins");
      await client.query("COMMIT");
    });

    it("allows only one of two concurrent final-admin removals to commit", async () => {
      await client.query("INSERT INTO companies (id) VALUES ('concurrent-company')");
      await client.query(`
        INSERT INTO users (id, company_id, company_role, company_status)
        VALUES
          ('concurrent-admin-one', 'concurrent-company', 'admin', 'active'),
          ('concurrent-admin-two', 'concurrent-company', 'admin', 'active')
      `);

      await firstConcurrentClient.query("BEGIN");
      await secondConcurrentClient.query("BEGIN");
      await firstConcurrentClient.query(`
        UPDATE users
        SET company_status = 'removed'
        WHERE id = 'concurrent-admin-one'
      `);

      const secondRemoval = secondConcurrentClient.query(`
        UPDATE users
        SET company_status = 'removed'
        WHERE id = 'concurrent-admin-two'
      `);

      await firstConcurrentClient.query("COMMIT");
      await secondRemoval;

      await expect(secondConcurrentClient.query("COMMIT")).rejects.toMatchObject({
        code: "23514",
        constraint: "company_requires_active_admin",
      });
    });
  },
);