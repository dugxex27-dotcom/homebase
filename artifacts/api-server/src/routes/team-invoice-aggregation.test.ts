import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { contractorInvoiceUploads, users } from "@workspace/db";
import { contractorTeamInvoiceJoinCondition } from "./team-invoice-aggregation";

describe("contractor team invoice aggregation", () => {
  it("scopes invoice totals and counts to the technician's current company", () => {
    const query = sql`
      select
        count(${contractorInvoiceUploads.id}),
        coalesce(sum(${contractorInvoiceUploads.amount}), 0)
      from ${users}
      left join ${contractorInvoiceUploads} on ${contractorTeamInvoiceJoinCondition()}
    `;
    const compiled = new PgDialect().sqlToQuery(query).sql;

    expect(compiled).toContain(
      '"contractor_tech_invoices"."uploaded_by_user_id" = "users"."id"',
    );
    expect(compiled).toContain(
      '"contractor_tech_invoices"."company_id" = "users"."company_id"',
    );
    expect(compiled).toContain(
      'coalesce(sum("contractor_tech_invoices"."amount"), 0)',
    );
  });
});