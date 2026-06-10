import { describe, expect, it } from 'vitest';
import { computeWmStreak } from '@/lib/sport/wm-streak';
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

describe('computeWmStreak', () => {
  it('Leeres Log -> none', () => {
    expect(computeWmStreak([])).toEqual({ kind: 'none', length: 0, lastDecidedId: null });
  });

  it('Nur pending/push -> none', () => {
    const s = computeWmStreak([
      entry({ id: '1', outcome: 'pending' }),
      entry({ id: '2', outcome: 'push', resolvedAt: 100 })
    ]);
    expect(s.kind).toBe('none');
  });

  it('Drei wins in Folge', () => {
    const s = computeWmStreak([
      entry({ id: '1', outcome: 'win', resolvedAt: 100 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 200 }),
      entry({ id: '3', outcome: 'win', resolvedAt: 300 })
    ]);
    expect(s.kind).toBe('treffer');
    expect(s.length).toBe(3);
    expect(s.lastDecidedId).toBe('3');
  });

  it('Loss bricht treffer-Strecke', () => {
    const s = computeWmStreak([
      entry({ id: '1', outcome: 'win', resolvedAt: 100 }),
      entry({ id: '2', outcome: 'win', resolvedAt: 200 }),
      entry({ id: '3', outcome: 'loss', resolvedAt: 300 })
    ]);
    expect(s.kind).toBe('fehl');
    expect(s.length).toBe(1);
  });

  it('Push wird in der Streak-Berechnung ignoriert', () => {
    const s = computeWmStreak([
      entry({ id: '1', outcome: 'win', resolvedAt: 100 }),
      entry({ id: '2', outcome: 'push', resolvedAt: 150 }),
      entry({ id: '3', outcome: 'win', resolvedAt: 200 })
    ]);
    expect(s.kind).toBe('treffer');
    expect(s.length).toBe(2);
  });

  it('Sortiert nach resolvedAt, nicht Reihenfolge im Array', () => {
    const s = computeWmStreak([
      entry({ id: 'old', outcome: 'loss', resolvedAt: 100 }),
      entry({ id: 'new', outcome: 'win', resolvedAt: 500 }),
      entry({ id: 'mid', outcome: 'win', resolvedAt: 300 })
    ]);
    expect(s.kind).toBe('treffer');
    expect(s.length).toBe(2);
    expect(s.lastDecidedId).toBe('new');
  });

  it('Fallback auf recordedAt wenn resolvedAt fehlt', () => {
    const s = computeWmStreak([
      entry({ id: 'a', outcome: 'loss', recordedAt: 100 }),
      entry({ id: 'b', outcome: 'win', recordedAt: 200 })
    ]);
    expect(s.kind).toBe('treffer');
    expect(s.lastDecidedId).toBe('b');
  });
});
