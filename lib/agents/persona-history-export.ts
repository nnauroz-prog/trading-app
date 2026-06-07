// CSV-Export der Persona-Track-Record-Historie. Pure Funktion — keine I/O,
// keine localStorage-Zugriffe. Identische RFC-4180-Konvention wie der
// Gold-Holdings-Export: Semikolon-Trennung (Excel-DE), CRLF-Zeilenende, BOM
// kommt im Component.

import type { HistoryEntry } from '@/lib/agents/persona-history';

export const CSV_HEADERS = [
  'Datum',
  'Asset-Klasse',
  'Persona-ID',
  'Verdict',
  'Target'
] as const;

function csvEscape(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function personaHistoryToCsv(entries: HistoryEntry[]): string {
  const sorted = [...entries].sort((a, b) => {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    if (a.klass !== b.klass) return a.klass.localeCompare(b.klass);
    return a.personaId.localeCompare(b.personaId);
  });
  const rows: string[] = [];
  rows.push(CSV_HEADERS.map((h) => csvEscape(h)).join(';'));
  for (const e of sorted) {
    rows.push([
      csvEscape(e.dateIso),
      csvEscape(e.klass),
      csvEscape(e.personaId),
      csvEscape(e.verdict),
      csvEscape(e.targetLabel ?? '')
    ].join(';'));
  }
  return rows.join('\r\n') + '\r\n';
}
