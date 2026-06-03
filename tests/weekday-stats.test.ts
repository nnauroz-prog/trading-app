import { describe, expect, it } from 'vitest';
import { tipsByWeekday } from '@/lib/sport/weekday-stats';
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

describe('tipsByWeekday', () => {
  it('liefert immer 7 Wochentage', () => {
    expect(tipsByWeekday([]).length).toBe(7);
  });

  it('ordnet 2026-06-06 (Samstag) korrekt zu', () => {
    const stats = tipsByWeekday([entry({ id: '1', date: '2026-06-06', outcome: 'win' })]);
    const sa = stats.find((s) => s.label === 'Sa')!;
    expect(sa.wins).toBe(1);
    expect(sa.hitRatePct).toBe(100);
  });

  it('Sonntag bekommt Index 7', () => {
    const stats = tipsByWeekday([entry({ id: '1', date: '2026-06-07', outcome: 'loss' })]);
    const so = stats.find((s) => s.label === 'So')!;
    expect(so.weekday).toBe(7);
    expect(so.decisive).toBe(1);
    expect(so.hitRatePct).toBe(0);
  });

  it('Push zählt zu resolved aber nicht zu decisive', () => {
    const stats = tipsByWeekday([
      entry({ id: '1', date: '2026-06-03', outcome: 'win' }),
      entry({ id: '2', date: '2026-06-03', outcome: 'push' })
    ]);
    const mi = stats.find((s) => s.label === 'Mi')!;
    expect(mi.resolved).toBe(2);
    expect(mi.decisive).toBe(1);
    expect(mi.hitRatePct).toBe(100);
  });

  it('Pending wird komplett ignoriert', () => {
    const stats = tipsByWeekday([entry({ id: '1', date: '2026-06-03', outcome: 'pending' })]);
    const mi = stats.find((s) => s.label === 'Mi')!;
    expect(mi.resolved).toBe(0);
    expect(mi.hitRatePct).toBe(null);
  });
});
