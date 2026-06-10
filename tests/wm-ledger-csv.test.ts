import { describe, expect, it } from 'vitest';
import { rowsToCsv, csvFilenameForToday } from '@/lib/sport/wm-ledger-csv';
import type { LedgerRow } from '@/lib/sport/wm-bankroll-ledger';

function row(over: Partial<LedgerRow> = {}): LedgerRow {
  const base: LedgerRow = {
    id: 'wm-x-home',
    fixtureId: 'wm-x',
    winnerSide: 'home',
    winnerTeam: 'Spanien',
    opponentTeam: 'Kap Verde',
    dateIso: '2026-06-15',
    stakePct: 2,
    stakeEur: 20,
    decimalOdds: 1.5,
    modelProbabilityPct: 72,
    tier: 'modell-favorit',
    recordedAt: 1000,
    outcome: 'win',
    pnlEur: 10
  };
  return { ...base, ...over };
}

describe('rowsToCsv', () => {
  it('Header-Zeile vorhanden', () => {
    const csv = rowsToCsv([]);
    expect(csv).toContain('Datum,Spiel,Tipp auf,Tier');
    expect(csv).toContain('Modell-Wahrscheinlichkeit');
    expect(csv).toContain('PnL EUR');
  });

  it('Win-Zeile wird komplett formatiert', () => {
    const csv = rowsToCsv([row()]);
    expect(csv).toContain('Spanien gegen Kap Verde');
    expect(csv).toContain('Treffer');
    expect(csv).toContain('1.50');
    expect(csv).toContain('20.00');
    expect(csv).toContain('10.00');
  });

  it('Pending-Zeile hat leere PnL-Spalte', () => {
    const csv = rowsToCsv([row({ outcome: 'pending', pnlEur: null })]);
    expect(csv).toContain('offen');
    const lines = csv.trim().split('\n');
    const dataLine = lines[1];
    expect(dataLine.endsWith(',')).toBe(true);
  });

  it('Loss zeigt negative PnL', () => {
    const csv = rowsToCsv([row({ outcome: 'loss', pnlEur: -20 })]);
    expect(csv).toContain('Fehl');
    expect(csv).toContain('-20.00');
  });

  it('Tier-Label uebersetzt', () => {
    const csv = rowsToCsv([row({ tier: 'hoechste-konfluenz' })]);
    expect(csv).toContain('Hoechste Konfluenz');
  });

  it('Spielname mit Komma wird escaped', () => {
    const csv = rowsToCsv([row({ winnerTeam: 'Foo, Bar', opponentTeam: 'Baz' })]);
    expect(csv).toContain('"Foo, Bar gegen Baz"');
  });

  it('Sortiert chronologisch nach dateIso', () => {
    const csv = rowsToCsv([
      row({ id: 'a', dateIso: '2026-06-20', recordedAt: 100 }),
      row({ id: 'b', dateIso: '2026-06-15', recordedAt: 200 })
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[1]).toContain('2026-06-15');
    expect(lines[2]).toContain('2026-06-20');
  });

  it('Bei gleichem dateIso entscheidet recordedAt', () => {
    const csv = rowsToCsv([
      row({ id: 'a', dateIso: '2026-06-15', recordedAt: 500, stakeEur: 30 }),
      row({ id: 'b', dateIso: '2026-06-15', recordedAt: 100, stakeEur: 10 })
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[1]).toContain('10.00');
    expect(lines[2]).toContain('30.00');
  });

  it('UTF-8-BOM voran', () => {
    const csv = rowsToCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('csvFilenameForToday liefert sinnvollen Namen', () => {
    expect(csvFilenameForToday('2026-06-15')).toBe('wm-ledger-2026-06-15.csv');
  });
});
