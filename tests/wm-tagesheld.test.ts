import { describe, expect, it } from 'vitest';
import { computeWmTagesheld } from '@/lib/sport/wm-tagesheld';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

function entry(over: Partial<WmPickLogEntry> = {}): WmPickLogEntry {
  const base: WmPickLogEntry = {
    id: 'x',
    fixtureId: 'wm-x',
    recordedAt: 0,
    dateIso: '2026-06-15',
    homeTeam: 'A',
    awayTeam: 'B',
    winnerTeam: 'A',
    winnerSide: 'home',
    modelProbabilityPct: 70,
    eloDiff: 100,
    tier: 'modell-favorit',
    factorSnapshot: [],
    proTipperConviction: 0.9,
    outcome: 'pending'
  };
  return { ...base, ...over };
}

describe('computeWmTagesheld', () => {
  it('Leeres Log -> beide null', () => {
    const r = computeWmTagesheld([], '2026-06-15');
    expect(r.tagesheld).toBeNull();
    expect(r.lehrstueck).toBeNull();
    expect(r.fromIso).toBe('2026-06-09');
    expect(r.toIso).toBe('2026-06-15');
  });

  it('Bester Win mit hoechster Wahrscheinlichkeit = Tagesheld', () => {
    const r = computeWmTagesheld([
      entry({ id: '1', outcome: 'win', modelProbabilityPct: 65 }),
      entry({ id: '2', outcome: 'win', modelProbabilityPct: 82, winnerTeam: 'Spanien' }),
      entry({ id: '3', outcome: 'loss', modelProbabilityPct: 70 })
    ], '2026-06-15');
    expect(r.tagesheld?.id).toBe('2');
    expect(r.tagesheld?.winnerTeam).toBe('Spanien');
  });

  it('Loss mit hoechster Wahrscheinlichkeit = Lehrstueck', () => {
    const r = computeWmTagesheld([
      entry({ id: '1', outcome: 'loss', modelProbabilityPct: 60 }),
      entry({ id: '2', outcome: 'loss', modelProbabilityPct: 78, winnerTeam: 'Brasilien' }),
      entry({ id: '3', outcome: 'win', modelProbabilityPct: 65 })
    ], '2026-06-15');
    expect(r.lehrstueck?.id).toBe('2');
    expect(r.lehrstueck?.winnerTeam).toBe('Brasilien');
  });

  it('Pushes werden ignoriert', () => {
    const r = computeWmTagesheld([
      entry({ id: '1', outcome: 'push', modelProbabilityPct: 90 }),
      entry({ id: '2', outcome: 'win', modelProbabilityPct: 65 })
    ], '2026-06-15');
    expect(r.tagesheld?.id).toBe('2');
    expect(r.lehrstueck).toBeNull();
  });

  it('Eintrag ausserhalb des Fensters wird nicht beruecksichtigt', () => {
    const r = computeWmTagesheld([
      entry({ id: 'old', dateIso: '2026-06-01', outcome: 'win', modelProbabilityPct: 95 }),
      entry({ id: 'in', dateIso: '2026-06-12', outcome: 'win', modelProbabilityPct: 70 })
    ], '2026-06-15', 7);
    expect(r.tagesheld?.id).toBe('in');
  });

  it('windowDays anpassbar', () => {
    const r = computeWmTagesheld([], '2026-06-15', 3);
    expect(r.fromIso).toBe('2026-06-13');
    expect(r.windowDays).toBe(3);
  });

  it('Opponent korrekt fuer winnerSide=away', () => {
    const r = computeWmTagesheld([
      entry({ id: '1', outcome: 'win', winnerSide: 'away', winnerTeam: 'B', homeTeam: 'A', awayTeam: 'B' })
    ], '2026-06-15');
    expect(r.tagesheld?.opponentTeam).toBe('A');
  });

  it('Endstand wird durchgereicht', () => {
    const r = computeWmTagesheld([
      entry({ id: '1', outcome: 'win', finalHomeScore: 2, finalAwayScore: 1 })
    ], '2026-06-15');
    expect(r.tagesheld?.finalHomeScore).toBe(2);
    expect(r.tagesheld?.finalAwayScore).toBe(1);
  });
});
