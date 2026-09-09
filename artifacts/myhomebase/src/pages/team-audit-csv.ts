export interface TeamAuditCsvEntry {
  targetName: string | null;
  teamAction: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

function escapeCsvCell(value: string): string {
  const spreadsheetSafeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`;
}

function actionLabel(action: string | null): string {
  if (!action) return 'Action';
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function serializeTeamAuditCsv(entries: TeamAuditCsvEntry[]): string {
  const rows = entries.map(entry => [
    new Date(entry.createdAt).toLocaleString(),
    entry.targetName ?? '',
    actionLabel(entry.teamAction),
    entry.actorName ?? '',
  ]);

  return [
    ['Date', 'Member', 'Action', 'Performed By'],
    ...rows,
  ].map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadTeamAuditCsv(entries: TeamAuditCsvEntry[]): void {
  const csv = `\uFEFF${serializeTeamAuditCsv(entries)}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `team-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}