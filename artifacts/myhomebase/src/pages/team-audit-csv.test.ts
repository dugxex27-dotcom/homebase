import { describe, expect, it } from 'vitest';
import { serializeTeamAuditCsv } from './team-audit-csv';

describe('serializeTeamAuditCsv', () => {
  it('exports the required columns and safely quotes spreadsheet values', () => {
    const csv = serializeTeamAuditCsv([{
      targetName: 'Doe, "Jane"',
      teamAction: 'suspended',
      actorName: 'Alex Admin',
      actorRole: 'owner',
      createdAt: '2026-09-09T15:30:00.000Z',
    }]);

    const [header, row] = csv.split('\r\n');
    expect(header).toBe('"Date","Member","Action","Performed By"');
    expect(row).toContain('"Doe, ""Jane"""');
    expect(row).toContain('"Suspended"');
    expect(row).toContain('"Alex Admin"');
  });

  it('exports only the entries supplied by the active UI filter', () => {
    const visibleEntries = [{
      targetName: 'Sam Member',
      teamAction: 'removed',
      actorName: 'Olivia Owner',
      actorRole: 'owner',
      createdAt: '2026-09-09T15:30:00.000Z',
    }];

    const csv = serializeTeamAuditCsv(visibleEntries);

    expect(csv).toContain('"Removed"');
    expect(csv).not.toContain('"Suspended"');
  });

  it('prevents exported names from becoming spreadsheet formulas', () => {
    const csv = serializeTeamAuditCsv([{
      targetName: '=HYPERLINK("https://example.com")',
      teamAction: 'removed',
      actorName: '+Admin',
      actorRole: 'owner',
      createdAt: '2026-09-09T15:30:00.000Z',
    }]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"\'+Admin"');
  });
});