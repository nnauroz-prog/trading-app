import { describe, expect, it } from 'vitest';
import { computeWmHeutePotenzial } from '@/lib/sport/wm-heute-potenzial';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';

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

function logEntry(id: string, outcome: WmPickLogEntry['outcome']): WmPickLogEntry {
  return {
    id,
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
    outcome
  };
}

describe('computeWmHeutePotenzial', () => {
  it('Keine Stakes -> alles 0', () => {
    const r = computeWmHeutePotenzial([], [], '2026-06-11');
    expect(r.offeneStakes).toBe(0);
    expect(r.imRisikoEur).toBe(0);
    expect(r.moeglicherGewinnEur).toBe(0);
  });

  it('Pending Stake von heute zaehlt', () => {
    const r = computeWmHeutePotenzial([stake({ stakeEur: 20, decimalOdds: 2.0 })], [], '2026-06-11');
    expect(r.offeneStakes).toBe(1);
    expect(r.imRisikoEur).toBe(20);
    expect(r.moeglicherGewinnEur).toBe(20);
  });

  it('Stake von gestern wird ignoriert', () => {
    const r = computeWmHeutePotenzial([stake({ dateIso: '2026-06-10' })], [], '2026-06-11');
    expect(r.offeneStakes).toBe(0);
  });

  it('Bereits entschiedener Stake (win) zaehlt nicht', () => {
    const r = computeWmHeutePotenzial([stake({ id: 'a' })], [logEntry('a', 'win')], '2026-06-11');
    expect(r.offeneStakes).toBe(0);
  });

  it('Bereits entschiedener Stake (loss) zaehlt nicht', () => {
    const r = computeWmHeutePotenzial([stake({ id: 'a' })], [logEntry('a', 'loss')], '2026-06-11');
    expect(r.offeneStakes).toBe(0);
  });

  it('Pick-Log-Eintrag pending laesst Stake offen', () => {
    const r = computeWmHeutePotenzial([stake({ id: 'a' })], [logEntry('a', 'pending')], '2026-06-11');
    expect(r.offeneStakes).toBe(1);
  });

  it('Mehrere offene Stakes summieren', () => {
    const r = computeWmHeutePotenzial([
      stake({ id: 'a', stakeEur: 20, decimalOdds: 2.0 }),
      stake({ id: 'b', stakeEur: 10, decimalOdds: 1.5 })
    ], [], '2026-06-11');
    expect(r.offeneStakes).toBe(2);
    expect(r.imRisikoEur).toBe(30);
    expect(r.moeglicherGewinnEur).toBe(25); // 20 + 5
  });

  it('Rundung auf 2 Nachkommastellen', () => {
    const r = computeWmHeutePotenzial([stake({ stakeEur: 13.33, decimalOdds: 1.77 })], [], '2026-06-11');
    expect(r.moeglicherGewinnEur).toBe(10.26);
  });
});
