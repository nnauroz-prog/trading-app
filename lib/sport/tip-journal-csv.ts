// CSV-Export für das Tipp-Tagebuch. Excel-kompatibel (Semikolon-Trenner +
// Komma als Dezimaltrenner würde Excel-DE noch besser passen, aber wir
// halten es an internationalen CSV-Konventionen).

import type { TipJournalEntry } from '@/lib/sport/tip-journal';

const HEADER = [
  'date',
  'league',
  'home',
  'away',
  'market',
  'modelProbabilityPct',
  'qualityScore',
  'qualityBand',
  'dataQuality',
  'isStableMarket',
  'outcome',
  'finalHomeScore',
  'finalAwayScore',
  'resolvedAt'
];

function escapeCell(v: string | number | boolean | undefined | null): string {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function tipJournalToCsv(log: TipJournalEntry[]): string {
  const lines: string[] = [HEADER.join(',')];
  for (const e of log) {
    lines.push([
      escapeCell(e.date),
      escapeCell(e.league),
      escapeCell(e.homeTeam),
      escapeCell(e.awayTeam),
      escapeCell(e.market),
      escapeCell(e.modelProbabilityPct),
      escapeCell(e.qualityScore),
      escapeCell(e.qualityBand),
      escapeCell(e.dataQuality),
      escapeCell(e.isStableMarket),
      escapeCell(e.outcome),
      escapeCell(e.finalHomeScore),
      escapeCell(e.finalAwayScore),
      escapeCell(e.resolvedAt ? new Date(e.resolvedAt).toISOString() : '')
    ].join(','));
  }
  return lines.join('\n');
}
