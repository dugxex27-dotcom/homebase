export type ServiceRecordCostState =
  | { kind: "value"; value: number; label: string }
  | { kind: "missing"; label: "Cost not provided" }
  | { kind: "invalid"; label: "Cost unavailable" };

export function parseServiceRecordCost(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getServiceRecordCostState(
  value: unknown,
): ServiceRecordCostState {
  if (value === null || value === undefined || value === "") {
    return { kind: "missing", label: "Cost not provided" };
  }

  const numericValue = parseServiceRecordCost(value);
  if (numericValue === null) {
    return { kind: "invalid", label: "Cost unavailable" };
  }

  return {
    kind: "value",
    value: numericValue,
    label: `$${numericValue.toFixed(2)}`,
  };
}

export function getServiceRecordCostInputValue(value: unknown): string {
  const numericValue = parseServiceRecordCost(value);
  return numericValue === null ? "" : String(numericValue);
}