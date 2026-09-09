import { describe, expect, it } from 'vitest';
import { buildAuditDateRangeParams, isAuditEntryInDateRange } from './contractor-audit-date-range';

describe('contractor audit date ranges', () => {
  it('keeps entries on both inclusive boundary dates', () => {
    expect(isAuditEntryInDateRange('2026-04-01T12:00:00.000Z', '2026-04-01', '2026-06-30')).toBe(true);
    expect(isAuditEntryInDateRange('2026-06-30T12:00:00.000Z', '2026-04-01', '2026-06-30')).toBe(true);
    expect(isAuditEntryInDateRange('2026-07-01T12:00:00.000Z', '2026-04-01', '2026-06-30')).toBe(false);
  });

  it('supports open-ended ranges', () => {
    expect(isAuditEntryInDateRange('2026-04-15T12:00:00.000Z', '2026-04-01', '')).toBe(true);
    expect(isAuditEntryInDateRange('2026-04-15T12:00:00.000Z', '', '2026-04-30')).toBe(true);
  });

  it('sends local-day start and end boundaries to the API', () => {
    const params = new URLSearchParams(buildAuditDateRangeParams('2026-04-01', '2026-04-30', 200, 400).slice(1));
    const from = new Date(params.get('fromDate')!);
    const to = new Date(params.get('toDate')!);

    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(3);
    expect(from.getDate()).toBe(1);
    expect(from.getHours()).toBe(0);
    expect(to.getDate()).toBe(30);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(params.get('limit')).toBe('200');
    expect(params.get('offset')).toBe('400');
  });
});