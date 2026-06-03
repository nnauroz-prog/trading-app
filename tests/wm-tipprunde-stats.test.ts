import { describe, expect, it } from 'vitest';
import { wmTipStats } from '@/lib/sport/wm-tipprunde-stats';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: 0,
    league: 'Bundesliga', date: '2026-06-15', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 50,
    outcome: 'pending',
    ...over
  };
}

describe('wmTipStats', () => {
  it('filtert nach Liga „WM 2026"', () => {
    const s = wmTipStats([
      entry({ id: '1', league: 'WM 2026', outcome: 'win' }),
      entry({ id: '2', league: 'Bundesliga', outcome: 'win' })
    ]);
    expect(s.total).toBe(1);
    expect(s.wins).toBe(1);
  });

  it('akzeptiert fixtureId Prefix „wm-"', () => {
    const s = wmTipStats([
      entry({ id: '1', fixtureId: 'wm-1', league: '', outcome: 'win' }),
      entry({ id: '2', fixtureId: 'wm-2', league: '', outcome: 'loss' })
    ]);
    expect(s.total).toBe(2);
    expect(s.hitRatePct).toBe(50);
  });

  it('liefert null Quote bei null entscheidenden Tipps', () => {
    const s = wmTipStats([entry({ id: '1', league: 'WM 2026', outcome: 'pending' })]);
    expect(s.pending).toBe(1);
    expect(s.hitRatePct).toBe(null);
  });

  it('Push korrekt gezählt (nicht decisive)', () => {
    const s = wmTipStats([
      entry({ id: '1', league: 'WM 2026', outcome: 'win' }),
      entry({ id: '2', league: 'WM 2026', outcome: 'push' })
    ]);
    expect(s.pushes).toBe(1);
    expect(s.hitRatePct).toBe(100);
  });
});
