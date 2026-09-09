import { describe, expect, it } from 'vitest';
import { parseTeamAuditDateRange } from './team-audit-date-range';

describe('team audit API date range', () => {
  it('accepts inclusive ISO boundaries and open-ended ranges', () => {
    const range = parseTeamAuditDateRange({
      fromDate: '2026-04-01T04:00:00.000Z',
      toDate: '2026-05-01T03:59:59.999Z',
    }, 50);
    expect(range?.fromDate?.toISOString()).toBe('2026-04-01T04:00:00.000Z');
    expect(range?.toDate?.toISOString()).toBe('2026-05-01T03:59:59.999Z');
    expect(parseTeamAuditDateRange({ fromDate: '2026-04-01T00:00:00.000Z' }, 50)).not.toBeNull();
    expect(parseTeamAuditDateRange({ toDate: '2026-04-30T23:59:59.999Z' }, 50)).not.toBeNull();
  });

  it('rejects malformed and reversed ranges', () => {
    expect(parseTeamAuditDateRange({ fromDate: '2026-04-01' }, 50)).toBeNull();
    expect(parseTeamAuditDateRange({
      fromDate: '2026-05-01T00:00:00.000Z',
      toDate: '2026-04-01T00:00:00.000Z',
    }, 50)).toBeNull();
  });

  it('orders mixed-offset boundaries by their actual instants', () => {
    expect(parseTeamAuditDateRange({
      fromDate: '2026-04-01T09:00:00.000+09:00',
      toDate: '2026-03-31T20:00:00.000-05:00',
    }, 50)).not.toBeNull();
    expect(parseTeamAuditDateRange({
      fromDate: '2026-03-31T20:00:00.000-05:00',
      toDate: '2026-04-01T09:00:00.000+09:00',
    }, 50)).toBeNull();
  });

  it('validates pagination and applies endpoint defaults', () => {
    expect(parseTeamAuditDateRange({}, 20)).toMatchObject({ limit: 20, offset: 0 });
    expect(parseTeamAuditDateRange({ limit: '200', offset: '400' }, 50)).toMatchObject({ limit: 200, offset: 400 });
    expect(parseTeamAuditDateRange({ limit: '201' }, 50)).toBeNull();
  });
});