import { describe, expect, it } from 'vitest';
import { findBestWeekday } from '@/lib/sport/best-weekday';
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

describe('findBestWeekday', () => {
  it('null bei leerem Tagebuch', () => {
    expect(findBestWeekday([])).toBe(null);
  });

  it('null wenn kein Tag ≥ 3 entschiedene Tipps hat', () => {
    expect(findBestWeekday([
      entry({ id: '1', date: '2026-06-06', outcome: 'win' }),
      entry({ id: '2', date: '2026-06-06', outcome: 'loss' })
    ])).toBe(null);
  });

  it('liefert Samstag wenn dort die beste Quote', () => {
    // Samstag 2026-06-06: 2/3 = 67%
    // Mittwoch 2026-06-03: 3/3 = 100% aber muss auch ≥ 3 sein
    const result = findBestWeekday([
      entry({ id: '1', date: '2026-06-06', outcome: 'win' }),
      entry({ id: '2', date: '2026-06-06', outcome: 'win' }),
      entry({ id: '3', date: '2026-06-06', outcome: 'loss' })
    ]);
    expect(result?.label).toBe('Sa');
    expect(result?.hitRatePct).toBe(67);
  });

  it('wählt den Tag mit höherer Quote bei Mehrfach-Erfüllung', () => {
    const result = findBestWeekday([
      // Mittwoch: 3 Treffer, 0 daneben → 100%
      entry({ id: '1', date: '2026-06-03', outcome: 'win' }),
      entry({ id: '2', date: '2026-06-03', outcome: 'win' }),
      entry({ id: '3', date: '2026-06-03', outcome: 'win' }),
      // Samstag: 1 Treffer, 2 daneben → 33%
      entry({ id: '4', date: '2026-06-06', outcome: 'win' }),
      entry({ id: '5', date: '2026-06-06', outcome: 'loss' }),
      entry({ id: '6', date: '2026-06-06', outcome: 'loss' })
    ]);
    expect(result?.label).toBe('Mi');
    expect(result?.hitRatePct).toBe(100);
  });
});
