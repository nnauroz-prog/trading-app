import { describe, expect, it } from 'vitest';
import { computeSanityHints } from '@/lib/sport/sanity-hint';
import type { TipJournalEntry } from '@/lib/sport/tip-journal';

function entry(over: Partial<TipJournalEntry>): TipJournalEntry {
  return {
    id: 'x', fixtureId: 'fx', recordedAt: Date.now(),
    league: 'L', date: '2026-06-01', homeTeam: 'A', awayTeam: 'B',
    tier: 'standard', market: 'Heimsieg A', modelProbabilityPct: 60,
    outcome: 'pending',
    ...over
  };
}

describe('computeSanityHints', () => {
  const NOW = new Date('2026-06-15T12:00:00');

  it('leeres Tagebuch → keine Hinweise', () => {
    expect(computeSanityHints([], NOW)).toEqual([]);
  });

  it('warnt vor zu vielen exakten Tipps', () => {
    const log = [
      entry({ id: '1', market: 'Ergebnis 2:1' }),
      entry({ id: '2', market: '1:1' }),
      entry({ id: '3', market: '0:0' }),
      entry({ id: '4', market: 'Heimsieg A' }),
      entry({ id: '5', market: 'Heimsieg A' })
    ];
    const hints = computeSanityHints(log, NOW);
    expect(hints.some((h) => h.id === 'too-many-exact')).toBe(true);
  });

  it('warnt vor niedriger Quote (<40 % über 10+ entschiedene)', () => {
    const log = Array.from({ length: 12 }, (_, i) =>
      entry({ id: `${i}`, outcome: i < 3 ? 'win' : 'loss', resolvedAt: i + 1 })
    );
    const hints = computeSanityHints(log, NOW);
    expect(hints.some((h) => h.id === 'low-hit-rate')).toBe(true);
  });

  it('lobt Streak ab 3 Treffer in Folge', () => {
    const log = [
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'win', resolvedAt: 3 })
    ];
    const hints = computeSanityHints(log, NOW);
    expect(hints.some((h) => h.id === 'on-fire')).toBe(true);
  });

  it('liefert Inaktivitäts-Hinweis nach 14 Tagen', () => {
    const old = new Date('2026-05-15T12:00:00').getTime();
    const hints = computeSanityHints([entry({ id: '1', recordedAt: old })], NOW);
    expect(hints.some((h) => h.id === 'inactive')).toBe(true);
  });

  it('Streak-Hinweis verschwindet nach Loss', () => {
    const log = [
      entry({ id: '1', outcome: 'win', resolvedAt: 1 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 2 }),
      entry({ id: '3', outcome: 'loss', resolvedAt: 3 })
    ];
    const hints = computeSanityHints(log, NOW);
    expect(hints.some((h) => h.id === 'on-fire')).toBe(false);
  });
});
