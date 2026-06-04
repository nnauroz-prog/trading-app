import { describe, expect, it } from 'vitest';
import { classifyMarket, tipsByMarket } from '@/lib/sport/tips-by-market';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'L', date: '2026-06-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending', ...over
  };
}

describe('classifyMarket', () => {
  it('Heimsieg', () => {
    expect(classifyMarket('Heimsieg Bayern')).toBe('Heimsieg');
  });
  it('Auswärtssieg', () => {
    expect(classifyMarket('Auswärtssieg BVB')).toBe('Auswärtssieg');
  });
  it('Remis / Unentschieden', () => {
    expect(classifyMarket('Unentschieden')).toBe('Remis');
    expect(classifyMarket('Remis')).toBe('Remis');
  });
  it('Doppelchance 1X / X2 / 12', () => {
    expect(classifyMarket('1X (A oder Remis)')).toBe('Doppelchance');
    expect(classifyMarket('X2 (B oder Remis)')).toBe('Doppelchance');
    expect(classifyMarket('12 kein Unentschieden')).toBe('Doppelchance');
  });
  it('Tor-Markt Over/Under', () => {
    expect(classifyMarket('Über 2,5 Tore')).toBe('Tor-Markt');
    expect(classifyMarket('Over 1.5 Tore')).toBe('Tor-Markt');
    expect(classifyMarket('Unter 4,5')).toBe('Tor-Markt');
  });
  it('BTTS', () => {
    expect(classifyMarket('Beide Teams treffen')).toBe('BTTS');
    expect(classifyMarket('BTTS ja')).toBe('BTTS');
  });
  it('Exakter Score', () => {
    expect(classifyMarket('Ergebnis 2:1')).toBe('Exakter Score');
    expect(classifyMarket('1:1')).toBe('Exakter Score');
  });
  it('Sonstige als Fallback', () => {
    expect(classifyMarket('was komisches')).toBe('Sonstige');
  });
});

describe('tipsByMarket', () => {
  it('aggregiert pro Kategorie', () => {
    const stats = tipsByMarket([
      entry({ id: '1', market: 'Heimsieg A', outcome: 'win' }),
      entry({ id: '2', market: 'Heimsieg A', outcome: 'loss' }),
      entry({ id: '3', market: 'Over 2.5 Tore', outcome: 'win' })
    ]);
    const home = stats.find((s) => s.category === 'Heimsieg')!;
    expect(home.resolved).toBe(2);
    expect(home.decisive).toBe(2);
    expect(home.hitRatePct).toBe(50);
    const goals = stats.find((s) => s.category === 'Tor-Markt')!;
    expect(goals.hitRatePct).toBe(100);
  });

  it('Pending wird ignoriert', () => {
    const stats = tipsByMarket([entry({ id: '1', outcome: 'pending' })]);
    expect(stats.length).toBe(0);
  });

  it('Push zählt zu resolved, nicht zu decisive', () => {
    const stats = tipsByMarket([
      entry({ id: '1', market: 'Heimsieg A', outcome: 'win' }),
      entry({ id: '2', market: 'Heimsieg A', outcome: 'push' })
    ]);
    const home = stats.find((s) => s.category === 'Heimsieg')!;
    expect(home.resolved).toBe(2);
    expect(home.decisive).toBe(1);
    expect(home.hitRatePct).toBe(100);
  });
});
