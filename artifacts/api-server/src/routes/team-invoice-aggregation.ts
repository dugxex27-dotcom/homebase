import { and, eq } from "drizzle-orm";
import { contractorInvoiceUploads, users } from "@workspace/db";

export function contractorTeamInvoiceJoinCondition() {
  return and(
    eq(contractorInvoiceUploads.uploadedByUserId, users.id),
    eq(contractorInvoiceUploads.companyId, users.companyId),
  );
}