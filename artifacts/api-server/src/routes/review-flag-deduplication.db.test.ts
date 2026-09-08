import { readFile } from "node:fs/promises";
import type { PoolClient } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "../db";
import { handleCreateReviewFlag } from "./review-flag-handler";

const migrationUrl = new URL(
  "../../migrations/20260908-review-flag-deduplication.sql",
  import.meta.url,
);

function responseRecorder() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
  };
  return response;
}

describe("review flag deduplication migration and route", () => {
  let client: PoolClient;

  beforeAll(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE review_flags (
        id varchar PRIMARY KEY,
        review_id varchar NOT NULL,
        reported_by varchar NOT NULL,
        reason text NOT NULL,
        notes text,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      ) ON COMMIT DROP
    `);
  });

  afterAll(async () => {
    await client.query("ROLLBACK");
    client.release();
  });

  it("removes historical duplicates and returns 409 for a repeated flag", async () => {
    await client.query(`
      INSERT INTO review_flags (id, review_id, reported_by, reason, created_at)
      VALUES
        ('oldest', 'historical-review', 'historical-reporter', 'spam', '2026-01-01'),
        ('newest', 'historical-review', 'historical-reporter', 'fake', '2026-01-02')
    `);

    const migration = await readFile(migrationUrl, "utf8");
    await client.query(migration);

    const historical = await client.query(
      "SELECT id FROM review_flags WHERE review_id = $1 AND reported_by = $2",
      ["historical-review", "historical-reporter"],
    );
    expect(historical.rows).toEqual([{ id: "oldest" }]);

    let insertedFlagNumber = 0;
    const reviewStorage = {
      getReview: async () => ({ id: "review-1", homeownerId: "review-author" }),
      createReviewFlag: async (flag: any) => {
        insertedFlagNumber += 1;
        const result = await client.query(
          `INSERT INTO review_flags
             (id, review_id, reported_by, reason, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING
             id,
             review_id AS "reviewId",
             reported_by AS "reportedBy",
             reason,
             notes,
             status`,
          [
            `flag-${insertedFlagNumber}`,
            flag.reviewId,
            flag.reportedBy,
            flag.reason,
            flag.notes,
            flag.status,
          ],
        );
        return result.rows[0];
      },
    } as any;
    const request = {
      session: { user: { id: "reporter-1" } },
      params: { id: "review-1" },
      body: { reason: "spam" },
    };

    const firstResponse = responseRecorder();
    await handleCreateReviewFlag(request, firstResponse, reviewStorage);
    expect(firstResponse.statusCode).toBe(201);

    const duplicateResponse = responseRecorder();
    await handleCreateReviewFlag(request, duplicateResponse, reviewStorage);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.body).toEqual({
      message: "You have already flagged this review",
      code: "REVIEW_ALREADY_FLAGGED",
    });
  });
});