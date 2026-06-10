import { describe, expect, it } from 'vitest';
import { computeWmForm } from '@/lib/sport/wm-form-window';
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
    outcome: 'win'
  };
  return { ...base, ...over };
}

describe('computeWmForm', () => {
  it('Leeres Log -> alle Werte 0/null', () => {
    const f = computeWmForm([], '2026-06-15', 7, 50);
    expect(f.bucket.decided).toBe(0);
    expect(f.bucket.hitRatePct).toBeNull();
    expect(f.vsTotalDeltaPpct).toBeNull();
    expect(f.fromIso).toBe('2026-06-09');
    expect(f.toIso).toBe('2026-06-15');
  });

  it('Nur Eintraege im Fenster zaehlen', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'win' }),
      entry({ id: '2', dateIso: '2026-06-01', outcome: 'win' }),   // ausserhalb
      entry({ id: '3', dateIso: '2026-06-10', outcome: 'loss' })
    ], '2026-06-15', 7, 50);
    expect(f.bucket.decided).toBe(2);
    expect(f.bucket.wins).toBe(1);
  });

  it('Trefferquote korrekt gerundet', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'win' }),
      entry({ id: '2', dateIso: '2026-06-14', outcome: 'win' }),
      entry({ id: '3', dateIso: '2026-06-13', outcome: 'loss' })
    ], '2026-06-15', 7, 50);
    expect(f.bucket.hitRatePct).toBe(67);
  });

  it('vsTotalDeltaPpct positiv wenn Fenster besser laeuft', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'win' }),
      entry({ id: '2', dateIso: '2026-06-14', outcome: 'win' })
    ], '2026-06-15', 7, 50);
    expect(f.bucket.hitRatePct).toBe(100);
    expect(f.vsTotalDeltaPpct).toBe(50);
  });

  it('vsTotalDeltaPpct negativ wenn Fenster schlechter laeuft', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'loss' }),
      entry({ id: '2', dateIso: '2026-06-14', outcome: 'loss' })
    ], '2026-06-15', 7, 65);
    expect(f.bucket.hitRatePct).toBe(0);
    expect(f.vsTotalDeltaPpct).toBe(-65);
  });

  it('pending zaehlt nicht in decided', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'pending' }),
      entry({ id: '2', dateIso: '2026-06-14', outcome: 'win' })
    ], '2026-06-15', 7, 50);
    expect(f.bucket.decided).toBe(1);
    expect(f.bucket.wins).toBe(1);
  });

  it('push erhoeht nur pushes', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'push' }),
      entry({ id: '2', dateIso: '2026-06-14', outcome: 'win' })
    ], '2026-06-15', 7, 50);
    expect(f.bucket.decided).toBe(1);
    expect(f.bucket.pushes).toBe(1);
  });

  it('Wenn totalHitRatePct null ist, Delta auch null', () => {
    const f = computeWmForm([
      entry({ id: '1', dateIso: '2026-06-15', outcome: 'win' })
    ], '2026-06-15', 7, null);
    expect(f.vsTotalDeltaPpct).toBeNull();
  });

  it('windowDays anpassbar', () => {
    const f = computeWmForm([], '2026-06-15', 3, 50);
    expect(f.fromIso).toBe('2026-06-13');
  });
});
