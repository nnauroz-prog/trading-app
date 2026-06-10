import { describe, expect, it } from 'vitest';
import { summarizeWmTrefferquote } from '@/lib/sport/wm-trefferquote';
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

describe('summarizeWmTrefferquote', () => {
  it('Leeres Log liefert leere Buckets', () => {
    const s = summarizeWmTrefferquote([]);
    expect(s.total.decided).toBe(0);
    expect(s.total.hitRatePct).toBeNull();
    expect(s.pending).toBe(0);
  });

  it('pending zaehlt nur als pending, nicht decided', () => {
    const s = summarizeWmTrefferquote([entry({ outcome: 'pending' })]);
    expect(s.pending).toBe(1);
    expect(s.total.decided).toBe(0);
  });

  it('win + loss erhoehen decided, push erhoeht nur pushes', () => {
    const s = summarizeWmTrefferquote([
      entry({ id: '1', outcome: 'win' }),
      entry({ id: '2', outcome: 'loss' }),
      entry({ id: '3', outcome: 'push' })
    ]);
    expect(s.total.decided).toBe(2);
    expect(s.total.wins).toBe(1);
    expect(s.total.losses).toBe(1);
    expect(s.total.pushes).toBe(1);
    expect(s.total.hitRatePct).toBe(50);
  });

  it('Tier-Buckets werden korrekt befuellt', () => {
    const s = summarizeWmTrefferquote([
      entry({ id: '1', tier: 'hoechste-konfluenz', outcome: 'win' }),
      entry({ id: '2', tier: 'hoechste-konfluenz', outcome: 'win' }),
      entry({ id: '3', tier: 'modell-favorit', outcome: 'loss' }),
      entry({ id: '4', tier: 'modell-favorit', outcome: 'win' })
    ]);
    expect(s.hoechsteKonfluenz.decided).toBe(2);
    expect(s.hoechsteKonfluenz.hitRatePct).toBe(100);
    expect(s.modellFavorit.decided).toBe(2);
    expect(s.modellFavorit.hitRatePct).toBe(50);
  });

  it('Trefferquote rundet kaufmaennisch', () => {
    const s = summarizeWmTrefferquote([
      entry({ id: '1', outcome: 'win' }),
      entry({ id: '2', outcome: 'win' }),
      entry({ id: '3', outcome: 'loss' })
    ]);
    expect(s.total.hitRatePct).toBe(67); // 0.666... -> 67
  });

  it('Nur push -> decided = 0, hitRate null', () => {
    const s = summarizeWmTrefferquote([
      entry({ id: '1', outcome: 'push' }),
      entry({ id: '2', outcome: 'push' })
    ]);
    expect(s.total.decided).toBe(0);
    expect(s.total.pushes).toBe(2);
    expect(s.total.hitRatePct).toBeNull();
  });
});
