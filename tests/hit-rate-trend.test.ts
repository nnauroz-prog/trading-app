import { describe, expect, it } from 'vitest';
import { computeHitRateTrend, summarizeTrend } from '@/lib/sport/hit-rate-trend';
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

describe('computeHitRateTrend', () => {
  const NOW = new Date('2026-06-03T12:00:00');

  it('liefert genau N Tage', () => {
    const t = computeHitRateTrend([], 7, NOW);
    expect(t.length).toBe(7);
  });

  it('ordnet resolved-Tipps dem richtigen Tag zu', () => {
    const twoDaysAgo = new Date('2026-06-01T15:30:00').getTime();
    const t = computeHitRateTrend([
      entry({ id: '1', resolvedAt: twoDaysAgo, outcome: 'win' }),
      entry({ id: '2', resolvedAt: twoDaysAgo, outcome: 'loss' })
    ], 7, NOW);
    const day = t.find((d) => d.iso === '2026-06-01');
    expect(day?.wins).toBe(1);
    expect(day?.decisive).toBe(2);
    expect(day?.hitRatePct).toBe(50);
  });

  it('kumulative HitRate akkumuliert über Tage', () => {
    const t1 = new Date('2026-06-01T10:00:00').getTime();
    const t2 = new Date('2026-06-02T10:00:00').getTime();
    const t = computeHitRateTrend([
      entry({ id: '1', resolvedAt: t1, outcome: 'win' }),
      entry({ id: '2', resolvedAt: t2, outcome: 'win' }),
      entry({ id: '3', resolvedAt: t2, outcome: 'loss' })
    ], 5, NOW);
    const last = t[t.length - 1];
    // bis NOW kumuliert: 2 wins, 3 decisive
    const target = t.find((d) => d.iso === '2026-06-02');
    expect(target?.cumulativeHitRatePct).toBe(67);
    expect(last.cumulativeHitRatePct).toBe(67); // bleibt gleich (kein neuer Tipp)
  });

  it('Push wird nicht als decisive gezählt', () => {
    const ms = new Date('2026-06-02T10:00:00').getTime();
    const t = computeHitRateTrend([
      entry({ id: '1', resolvedAt: ms, outcome: 'win' }),
      entry({ id: '2', resolvedAt: ms, outcome: 'push' })
    ], 5, NOW);
    const d = t.find((day) => day.iso === '2026-06-02')!;
    expect(d.resolved).toBe(2);
    expect(d.decisive).toBe(1);
    expect(d.hitRatePct).toBe(100);
  });

  it('Pending wird komplett ignoriert', () => {
    const ms = new Date('2026-06-02T10:00:00').getTime();
    const t = computeHitRateTrend([
      entry({ id: '1', resolvedAt: 0, outcome: 'pending' }),
      entry({ id: '2', resolvedAt: ms, outcome: 'win' })
    ], 5, NOW);
    const d = t.find((day) => day.iso === '2026-06-02')!;
    expect(d.resolved).toBe(1);
  });
});

describe('summarizeTrend', () => {
  it('aggregiert Wins, Resolved, Decisive korrekt', () => {
    const NOW = new Date('2026-06-03T12:00:00');
    const days = computeHitRateTrend([
      entry({ id: '1', resolvedAt: new Date('2026-06-01T10:00:00').getTime(), outcome: 'win' }),
      entry({ id: '2', resolvedAt: new Date('2026-06-02T10:00:00').getTime(), outcome: 'loss' }),
      entry({ id: '3', resolvedAt: new Date('2026-06-02T10:00:00').getTime(), outcome: 'win' })
    ], 7, NOW);
    const s = summarizeTrend(days);
    expect(s.wins).toBe(2);
    expect(s.resolved).toBe(3);
    expect(s.decisive).toBe(3);
    expect(s.hitRatePct).toBe(67);
    expect(s.activeDays).toBe(2);
  });
});
