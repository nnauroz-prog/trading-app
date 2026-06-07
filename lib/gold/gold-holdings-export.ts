// CSV-Export für Gold-Holdings. Pure Funktion — keine I/O, keine localStorage-
// Zugriffe. Browser-Download wird separat im Component umgesetzt.
//
// Format: RFC-4180-konform. Felder werden mit " umschlossen, " im Wert wird
// zu "" verdoppelt. Trennzeichen ist Semikolon (Excel-DE-Standard).

import type { GoldHolding } from '@/lib/gold/gold-holdings-store';

export const CSV_HEADERS = [
  'Bezeichnung',
  'Kaufdatum',
  'Menge',
  'Einheit',
  'Feingehalt-Promille',
  'Kaufpreis-Modus',
  'Kaufpreis',
  'Gebühren',
  'Verkaufsspread (%)'
] as const;

function csvEscape(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '';
  return String(value);
}

export function holdingsToCsv(holdings: GoldHolding[]): string {
  const rows: string[] = [];
  rows.push(CSV_HEADERS.map((h) => csvEscape(h)).join(';'));
  for (const h of holdings) {
    const fields = [
      h.label,
      h.purchaseDate,
      formatNumber(h.amount),
      h.amountUnit,
      formatNumber(h.purityPromille),
      h.purchasePriceMode,
      formatNumber(h.purchasePrice),
      formatNumber(h.fees),
      formatNumber(h.sellSpreadPct)
    ];
    rows.push(fields.map((f) => csvEscape(f)).join(';'));
  }
  // CRLF, weil Excel das beim CSV-Import erwartet.
  return rows.join('\r\n') + '\r\n';
}
