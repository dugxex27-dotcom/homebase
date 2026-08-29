export interface CrmLeadFilters {
  status?: string;
  priority?: string;
  source?: string;
  searchQuery?: string;
}

export function buildCrmLeadsUrl(filters: CrmLeadFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  const query = params.toString();
  return `/api/crm/leads${query ? `?${query}` : ""}`;
}

export async function fetchCrmLeads<T>(
  filters: CrmLeadFilters,
  fetcher: typeof fetch = fetch,
): Promise<T[]> {
  const response = await fetcher(buildCrmLeadsUrl(filters), {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch CRM leads");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Invalid CRM leads response");
  }
  return payload as T[];
}