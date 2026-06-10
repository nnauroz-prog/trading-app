import { describe, expect, it } from 'vitest';
import { rankWmComboPicks } from '@/lib/sport/wm-combo-picks';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

function pick(over: Partial<WmWinnerPick> & { fixtureId: string }): WmWinnerPick {
  return {
    fixture: { id: over.fixtureId, date: '2026-06-15', time: null, homeTeam: 'X', awayTeam: 'Y', venue: '', phase: 'Gruppe' },
    prediction: {} as never,
    winnerTeam: 'X',
    winnerSide: 'home',
    modelProbabilityPct: 70,
    eloDiff: 150,
    daysUntilMatch: 1,
    proTipper: {} as never,
    conditions: {} as never,
    tier: 'modell-favorit',
    reasons: [],
    riskNotes: [],
    ...over
  };
}

describe('rankWmComboPicks', () => {
  it('Unter 2 Picks → leeres Array', () => {
    expect(rankWmComboPicks({ picks: [] }).length).toBe(0);
    expect(rankWmComboPicks({ picks: [pick({ fixtureId: 'a' })] }).length).toBe(0);
  });

  it('Joint-Probability = Produkt der Einzel-Probabilities', () => {
    const combos = rankWmComboPicks({ picks: [
      pick({ fixtureId: 'a', modelProbabilityPct: 70 }),
      pick({ fixtureId: 'b', modelProbabilityPct: 70 })
    ], maxSize: 2 });
    const c = combos[0];
    expect(c.jointProbabilityPct).toBe(49); // 0.7 * 0.7 = 0.49
  });

  it('EV bei 70-70-Combo + Quote 2.0: 49 % * 3 - 51 % = ~96 % EV', () => {
    const combos = rankWmComboPicks({ picks: [
      pick({ fixtureId: 'a', modelProbabilityPct: 70 }),
      pick({ fixtureId: 'b', modelProbabilityPct: 70 })
    ], maxSize: 2, defaultOdds: 2.0 });
    expect(combos[0].evLabel).toBe('POSITIV');
  });

  it('Niedrige Probabilities → NEGATIV-EV', () => {
    const combos = rankWmComboPicks({ picks: [
      pick({ fixtureId: 'a', modelProbabilityPct: 30 }),
      pick({ fixtureId: 'b', modelProbabilityPct: 30 })
    ], maxSize: 2 });
    expect(combos[0].evLabel).toBe('NEGATIV');
  });

  it('maxSize 2 → keine 3er-Combos', () => {
    const combos = rankWmComboPicks({ picks: [
      pick({ fixtureId: 'a' }), pick({ fixtureId: 'b' }), pick({ fixtureId: 'c' })
    ], maxSize: 2 });
    for (const c of combos) {
      expect(c.picks.length).toBeLessThanOrEqual(2);
    }
  });

  it('Sortiert nach EV absteigend', () => {
    const combos = rankWmComboPicks({ picks: [
      pick({ fixtureId: 'a', modelProbabilityPct: 80 }),
      pick({ fixtureId: 'b', modelProbabilityPct: 50 }),
      pick({ fixtureId: 'c', modelProbabilityPct: 75 })
    ], maxSize: 3 });
    for (let i = 1; i < combos.length; i++) {
      expect(combos[i].expectedValuePct).toBeLessThanOrEqual(combos[i - 1].expectedValuePct);
    }
  });
});
