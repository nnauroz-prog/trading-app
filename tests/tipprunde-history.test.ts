import { describe, expect, it } from 'vitest';
import { weeklyHistory } from '@/lib/sport/tipprunde-history';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'L', date: '2026-06-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

describe('weeklyHistory', () => {
  const NOW = new Date('2026-06-03T12:00:00'); // Mittwoch

  it('liefert genau N Wochen', () => {
    expect(weeklyHistory([], 6, NOW).length).toBe(6);
  });

  it('ordnet einen Tipp der richtigen Woche zu', () => {
    const thisWeekMs = new Date('2026-06-02T10:00:00').getTime(); // Dienstag dieser Woche
    const lastWeekMs = new Date('2026-05-27T10:00:00').getTime(); // letzte Woche
    const history = weeklyHistory([
      entry({ id: '1', resolvedAt: thisWeekMs, outcome: 'win' }),
      entry({ id: '2', resolvedAt: lastWeekMs, outcome: 'win' }),
      entry({ id: '3', resolvedAt: lastWeekMs, outcome: 'loss' })
    ], 3, NOW);
    const thisWeek = history[history.length - 1];
    const lastWeek = history[history.length - 2];
    expect(thisWeek.wins).toBe(1);
    expect(lastWeek.wins).toBe(1);
    expect(lastWeek.decisive).toBe(2);
    expect(lastWeek.hitRatePct).toBe(50);
  });

  it('ignoriert Pending komplett', () => {
    const thisWeekMs = new Date('2026-06-02T10:00:00').getTime();
    const h = weeklyHistory([
      entry({ id: '1', resolvedAt: 0, outcome: 'pending' }),
      entry({ id: '2', resolvedAt: thisWeekMs, outcome: 'win' })
    ], 1, NOW);
    expect(h[0].resolved).toBe(1);
  });

  it('Push zählt zu resolved, nicht zu decisive', () => {
    const ms = new Date('2026-06-02T10:00:00').getTime();
    const h = weeklyHistory([
      entry({ id: '1', resolvedAt: ms, outcome: 'win' }),
      entry({ id: '2', resolvedAt: ms, outcome: 'push' })
    ], 1, NOW);
    expect(h[0].resolved).toBe(2);
    expect(h[0].decisive).toBe(1);
    expect(h[0].hitRatePct).toBe(100);
  });
});
