import { format } from 'date-fns';

export function isAuditEntryInDateRange(createdAt: string, fromDate: string, toDate: string) {
  const eventDate = format(new Date(createdAt), 'yyyy-MM-dd');
  return (!fromDate || eventDate >= fromDate) && (!toDate || eventDate <= toDate);
}

export function buildAuditDateRangeParams(fromDate: string, toDate: string, limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (fromDate) params.set('fromDate', new Date(`${fromDate}T00:00:00.000`).toISOString());
  if (toDate) params.set('toDate', new Date(`${toDate}T23:59:59.999`).toISOString());
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  const query = params.toString();
  return query ? `?${query}` : '';
}