import { describe, expect, it } from 'vitest';
import { holdingsToCsv, CSV_HEADERS } from '@/lib/gold/gold-holdings-export';
import type { GoldHolding } from '@/lib/gold/gold-holdings-store';

function holding(over: Partial<GoldHolding> = {}): GoldHolding {
  return {
    id: 'h-1',
    label: 'Krügerrand',
    createdAt: 1700000000000,
    purchaseDate: '2024-06-09',
    amount: 100,
    amountUnit: 'gram',
    purityPromille: 999,
    purchasePriceMode: 'auto',
    ...over
  };
}

describe('holdingsToCsv', () => {
  it('leere Liste → nur Header + Endzeile', () => {
    const csv = holdingsToCsv([]);
    expect(csv).toBe(CSV_HEADERS.join(';') + '\r\n');
  });

  it('eine Position wird als Datensatz angehängt', () => {
    const csv = holdingsToCsv([holding()]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1].split(';')[0]).toBe('Krügerrand');
    expect(lines[1].split(';')[1]).toBe('2024-06-09');
  });

  it('Semikolon im Label wird korrekt escaped', () => {
    const csv = holdingsToCsv([holding({ label: 'Krügerrand; 1 oz' })]);
    expect(csv).toContain('"Krügerrand; 1 oz"');
  });

  it('Anführungszeichen werden verdoppelt', () => {
    const csv = holdingsToCsv([holding({ label: 'Maple "Leaf"' })]);
    expect(csv).toContain('"Maple ""Leaf"""');
  });

  it('fehlende optionale Werte → leere Felder, nicht 0', () => {
    const csv = holdingsToCsv([holding({ purchasePrice: undefined, fees: undefined, sellSpreadPct: undefined })]);
    const row = csv.trim().split('\r\n')[1];
    const fields = row.split(';');
    // Felder: Bezeichnung, Datum, Menge, Einheit, Promille, Modus, Kaufpreis, Gebühren, Spread
    expect(fields[6]).toBe(''); // purchasePrice
    expect(fields[7]).toBe(''); // fees
    expect(fields[8]).toBe(''); // sellSpreadPct
  });

  it('mehrere Positionen erscheinen als getrennte Zeilen', () => {
    const csv = holdingsToCsv([
      holding({ id: 'a', label: 'A' }),
      holding({ id: 'b', label: 'B' }),
      holding({ id: 'c', label: 'C' })
    ]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(4); // Header + 3 Datenzeilen
  });

  it('Header-Reihenfolge passt zur Spalten-Reihenfolge', () => {
    expect(CSV_HEADERS[0]).toBe('Bezeichnung');
    expect(CSV_HEADERS[1]).toBe('Kaufdatum');
    expect(CSV_HEADERS[2]).toBe('Menge');
    expect(CSV_HEADERS[3]).toBe('Einheit');
    expect(CSV_HEADERS[8]).toBe('Verkaufsspread (%)');
  });
});
