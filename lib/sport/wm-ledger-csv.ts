// CSV-Export der WM-Ledger-Zeilen.
//
// Format: Excel-kompatibel (Komma-Trennung, doppelte Anfuehrungszeichen,
// erste Zeile = UTF-8-BOM + Header). Reine Funktion, kein DOM/Window.
//
// Spalten bewusst sprechend benannt, damit der User die Datei in Excel
// oder Google Sheets sofort versteht.

import type { LedgerRow } from '@/lib/sport/wm-bankroll-ledger';

const HEADERS = [
  'Datum',
  'Spiel',
  'Tipp auf',
  'Tier',
  'Modell-Wahrscheinlichkeit %',
  'Quote',
  'Einsatz EUR',
  'Ergebnis',
  'PnL EUR'
] as const;

function escapeCell(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function outcomeLabel(o: LedgerRow['outcome']): string {
  if (o === 'win') return 'Treffer';
  if (o === 'loss') return 'Fehl';
  if (o === 'push') return 'Push';
  return 'offen';
}

function tierLabel(t: LedgerRow['tier']): string {
  return t === 'hoechste-konfluenz' ? 'Hoechste Konfluenz' : 'Modell-Favorit';
}

export function rowsToCsv(rows: LedgerRow[]): string {
  const lines = [HEADERS.join(',')];
  const sorted = [...rows].sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.recordedAt - b.recordedAt);
  for (const r of sorted) {
    const cells = [
      r.dateIso,
      `${r.winnerTeam} gegen ${r.opponentTeam}`,
      r.winnerTeam,
      tierLabel(r.tier),
      r.modelProbabilityPct,
      r.decimalOdds.toFixed(2),
      r.stakeEur.toFixed(2),
      outcomeLabel(r.outcome),
      r.pnlEur === null ? '' : r.pnlEur.toFixed(2)
    ].map(escapeCell);
    lines.push(cells.join(','));
  }
  // BOM voran, damit Excel UTF-8 sauber liest.
  return '﻿' + lines.join('\n') + '\n';
}

export function csvFilenameForToday(todayIso: string): string {
  return `wm-ledger-${todayIso}.csv`;
}
