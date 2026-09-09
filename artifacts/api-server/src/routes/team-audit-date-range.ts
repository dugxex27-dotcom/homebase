import { z } from 'zod';

const auditDateRangeSchema = z.object({
  fromDate: z.string().datetime({ offset: true }).optional(),
  toDate: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).default(0),
}).refine(
  range => !range.fromDate || !range.toDate ||
    new Date(range.fromDate).getTime() <= new Date(range.toDate).getTime(),
  { message: 'fromDate must be on or before toDate' },
);

export function parseTeamAuditDateRange(query: unknown, defaultLimit: number) {
  const result = auditDateRangeSchema.safeParse(query);
  if (!result.success) return null;

  return {
    fromDate: result.data.fromDate ? new Date(result.data.fromDate) : undefined,
    toDate: result.data.toDate ? new Date(result.data.toDate) : undefined,
    limit: result.data.limit ?? defaultLimit,
    offset: result.data.offset,
  };
}