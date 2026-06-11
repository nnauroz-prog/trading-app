import { describe, expect, it } from 'vitest';
import { computeWmHeuteBilanz } from '@/lib/sport/wm-heute-bilanz';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';

function entry(over: Partial<WmPickLogEntry> = {}): WmPickLogEntry {
  const base: WmPickLogEntry = {
    id: 'wm-x-home',
    fixtureId: 'wm-x',
    recordedAt: 0,
    dateIso: '2026-06-11',
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

function stake(over: Partial<StakeRecord> = {}): StakeRecord {
  const base: StakeRecord = {
    id: 'wm-x-home',
    fixtureId: 'wm-x',
    winnerSide: 'home',
    winnerTeam: 'A',
    opponentTeam: 'B',
    dateIso: '2026-06-11',
    stakePct: 2,
    stakeEur: 20,
    decimalOdds: 1.9,
    modelProbabilityPct: 70,
    tier: 'modell-favorit',
    recordedAt: 100
  };
  return { ...base, ...over };
}

describe('computeWmHeuteBilanz', () => {
  it('Leeres Log -> 0 Tipps Headline', () => {
    const r = computeWmHeuteBilanz([], [], '2026-06-11');
    expect(r.pickCountHeute).toBe(0);
    expect(r.hasResolved).toBe(false);
    expect(r.headline).toContain('0 Tipps');
  });

  it('Picks anderer Tage werden ignoriert', () => {
    const r = computeWmHeuteBilanz([entry({ dateIso: '2026-06-10', outcome: 'win' })], [], '2026-06-11');
    expect(r.pickCountHeute).toBe(0);
  });

  it('Wins/Losses zaehlen', () => {
    const r = computeWmHeuteBilanz([
      entry({ id: 'a', outcome: 'win' }),
      entry({ id: 'b', outcome: 'loss' }),
      entry({ id: 'c', outcome: 'win' })
    ], [], '2026-06-11');
    expect(r.wins).toBe(2);
    expect(r.losses).toBe(1);
    expect(r.hasResolved).toBe(true);
    expect(r.headline).toContain('2/3 getroffen');
  });

  it('Push zaehlt nicht in decided, aber als pushes', () => {
    const r = computeWmHeuteBilanz([
      entry({ id: 'a', outcome: 'win' }),
      entry({ id: 'b', outcome: 'push' })
    ], [], '2026-06-11');
    expect(r.wins).toBe(1);
    expect(r.pushes).toBe(1);
    expect(r.headline).toContain('1/1 getroffen');
  });

  it('Netto-PnL aus Ledger summiert', () => {
    const r = computeWmHeuteBilanz([
      entry({ id: 'a', outcome: 'win' }),
      entry({ id: 'b', outcome: 'loss' })
    ], [
      stake({ id: 'a', stakeEur: 20, decimalOdds: 2.0 }),
      stake({ id: 'b', stakeEur: 20, decimalOdds: 1.8 })
    ], '2026-06-11');
    expect(r.netPnlEur).toBe(0); // +20 win, -20 loss
    expect(r.headline).toContain('1/2 getroffen');
  });

  it('Headline mit Netto-PnL bei Gewinn', () => {
    const r = computeWmHeuteBilanz([entry({ id: 'a', outcome: 'win' })], [stake({ id: 'a', stakeEur: 20, decimalOdds: 2.0 })], '2026-06-11');
    expect(r.netPnlEur).toBe(20);
    expect(r.headline).toContain('+20.00 EUR');
  });

  it('Pending zaehlt separat, Headline sagt "offen"', () => {
    const r = computeWmHeuteBilanz([entry({ id: 'a', outcome: 'pending' })], [], '2026-06-11');
    expect(r.pending).toBe(1);
    expect(r.hasResolved).toBe(false);
    expect(r.headline).toContain('offen');
  });

  it('Stake fehlt -> kein PnL-Beitrag, aber Win zaehlt', () => {
    const r = computeWmHeuteBilanz([entry({ id: 'a', outcome: 'win' })], [], '2026-06-11');
    expect(r.wins).toBe(1);
    expect(r.netPnlEur).toBe(0);
  });

  it('Headline ohne PnL wenn 0 Netto', () => {
    const r = computeWmHeuteBilanz([entry({ id: 'a', outcome: 'push' })], [stake({ id: 'a' })], '2026-06-11');
    expect(r.headline).not.toContain('EUR');
  });
});
