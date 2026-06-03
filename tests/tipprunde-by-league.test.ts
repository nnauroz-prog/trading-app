import { describe, expect, it } from 'vitest';
import { tipsByLeague } from '@/lib/sport/tipprunde-by-league';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'Bundesliga', date: '2026-05-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

describe('tipsByLeague', () => {
  it('gruppiert nach Liga und sortiert nach total absteigend', () => {
    const stats = tipsByLeague([
      entry({ id: '1', league: 'Bundesliga', outcome: 'win' }),
      entry({ id: '2', league: 'Bundesliga', outcome: 'loss' }),
      entry({ id: '3', league: 'Bundesliga', outcome: 'win' }),
      entry({ id: '4', league: 'Premier League', outcome: 'win' })
    ]);
    expect(stats[0].league).toBe('Bundesliga');
    expect(stats[0].total).toBe(3);
    expect(stats[0].wins).toBe(2);
    expect(stats[0].hitRatePct).toBe(67);
    expect(stats[1].league).toBe('Premier League');
    expect(stats[1].hitRatePct).toBe(100);
  });

  it('hitRatePct=null wenn nur pending', () => {
    const stats = tipsByLeague([entry({ id: '1', outcome: 'pending' })]);
    expect(stats[0].hitRatePct).toBe(null);
    expect(stats[0].resolved).toBe(0);
  });

  it('Push zählt zu resolved, nicht zu decisive', () => {
    const stats = tipsByLeague([
      entry({ id: '1', outcome: 'win' }),
      entry({ id: '2', outcome: 'push' })
    ]);
    expect(stats[0].resolved).toBe(2);
    expect(stats[0].decisive).toBe(1);
    expect(stats[0].hitRatePct).toBe(100);
  });

  it('Default-Liga „unbekannt" wenn league leer', () => {
    const stats = tipsByLeague([entry({ id: '1', league: '' })]);
    expect(stats[0].league).toBe('unbekannt');
  });
});
