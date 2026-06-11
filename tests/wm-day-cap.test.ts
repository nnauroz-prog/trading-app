import { describe, expect, it } from 'vitest';
import { computeWmDayCapStatus, DAY_CAP_PCT_DEFAULT } from '@/lib/sport/wm-day-cap';
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
    decimalOdds: 2.0,
    modelProbabilityPct: 70,
    tier: 'modell-favorit',
    recordedAt: 0
  };
  return { ...base, ...over };
}

describe('computeWmDayCapStatus', () => {
  it('Bankroll null -> capEur null, kein wouldExceed', () => {
    const r = computeWmDayCapStatus([], '2026-06-11', null);
    expect(r.capEur).toBeNull();
    expect(r.wouldExceedCap).toBe(false);
  });

  it('Default capPct = 8 %, 500 EUR Bankroll -> capEur 40', () => {
    const r = computeWmDayCapStatus([], '2026-06-11', 500);
    expect(r.capPct).toBe(DAY_CAP_PCT_DEFAULT);
    expect(r.capEur).toBe(40);
  });

  it('usedTodayEur summiert nur HEUTE', () => {
    const r = computeWmDayCapStatus([
      stake({ id: 'a', stakeEur: 20 }),
      stake({ id: 'b', stakeEur: 15, dateIso: '2026-06-10' })
    ], '2026-06-11', 500);
    expect(r.usedTodayEur).toBe(20);
  });

  it('usedTodayPct gerundet auf eine Nachkommastelle', () => {
    const r = computeWmDayCapStatus([stake({ stakeEur: 13.33 })], '2026-06-11', 500);
    expect(r.usedTodayPct).toBe(2.7);
  });

  it('Neuer Stake innerhalb des Caps -> wouldExceedCap false', () => {
    const r = computeWmDayCapStatus([stake({ stakeEur: 20 })], '2026-06-11', 500, 15);
    expect(r.wouldExceedCap).toBe(false);
    expect(r.remainingEur).toBe(20);
  });

  it('Neuer Stake genau am Cap -> nicht ueberschritten', () => {
    const r = computeWmDayCapStatus([stake({ stakeEur: 20 })], '2026-06-11', 500, 20);
    expect(r.wouldExceedCap).toBe(false);
  });

  it('Neuer Stake oberhalb Cap -> wouldExceedCap true', () => {
    const r = computeWmDayCapStatus([stake({ stakeEur: 20 })], '2026-06-11', 500, 25);
    expect(r.wouldExceedCap).toBe(true);
  });

  it('remainingEur kann negativ werden wenn schon ueberzogen', () => {
    const r = computeWmDayCapStatus([stake({ stakeEur: 50 })], '2026-06-11', 500);
    expect(r.remainingEur).toBe(-10);
  });

  it('capPct anpassbar', () => {
    const r = computeWmDayCapStatus([], '2026-06-11', 500, 0, 5);
    expect(r.capEur).toBe(25);
  });

  it('newStakeEur = 0 prueft nichts', () => {
    const r = computeWmDayCapStatus([stake({ stakeEur: 50 })], '2026-06-11', 500, 0);
    expect(r.wouldExceedCap).toBe(false);
  });
});
