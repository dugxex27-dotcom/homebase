import type { InsertServiceRecord } from "@workspace/db";

export class ServiceRecordInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceRecordInputError";
  }
}

type MutableServiceRecordInput = Partial<InsertServiceRecord>;

const WRITABLE_FIELDS = [
  "companyId",
  "employeeId",
  "homeownerId",
  "houseId",
  "customerName",
  "customerAddress",
  "customerPhone",
  "customerEmail",
  "serviceType",
  "serviceDescription",
  "homeArea",
  "duration",
  "status",
  "notes",
  "materialsUsed",
  "warrantyPeriod",
  "isVisibleToHomeowner",
  "invoiceUrl",
  "servicePhotos",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDateOnly(
  value: unknown,
  label: string,
  allowNull: boolean,
): Date | null {
  if (value === null || value === "") {
    if (allowNull) return null;
    throw new ServiceRecordInputError(`${label} is required`);
  }
  if (typeof value !== "string") {
    throw new ServiceRecordInputError(`${label} must be a valid date`);
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ServiceRecordInputError(`${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== trimmed
  ) {
    throw new ServiceRecordInputError(`${label} must be a valid date`);
  }

  return date;
}

function normalizeCost(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new ServiceRecordInputError(
      "Service cost must be a valid non-negative number",
    );
  }

  return numericValue.toFixed(2);
}

export function normalizeServiceRecordMutationInput(
  value: unknown,
): MutableServiceRecordInput {
  if (!isObject(value)) {
    throw new ServiceRecordInputError("Service record data must be an object");
  }

  const normalized: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      normalized[field] = value[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, "serviceDate")) {
    const serviceDate = normalizeDateOnly(value.serviceDate, "Service date", false);
    normalized.serviceDate = serviceDate?.toISOString().slice(0, 10);
  }

  if (Object.prototype.hasOwnProperty.call(value, "followUpDate")) {
    const followUpDate = normalizeDateOnly(
      value.followUpDate,
      "Follow-up date",
      true,
    );
    normalized.followUpDate = followUpDate?.toISOString().slice(0, 10) ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(value, "cost")) {
    const cost = normalizeCost(value.cost);
    if (cost !== undefined) normalized.cost = cost;
  }

  return normalized as MutableServiceRecordInput;
}