import { describe, expect, it } from 'vitest';
import { buildWmRoiVerlauf } from '@/lib/sport/wm-roi-verlauf';
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
    outcome: 'win'
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
    decimalOdds: 2.0,
    modelProbabilityPct: 70,
    tier: 'modell-favorit',
    recordedAt: 100
  };
  return { ...base, ...over };
}

describe('buildWmRoiVerlauf', () => {
  it('Leeres Log -> hasData false, alle PnL 0', () => {
    const v = buildWmRoiVerlauf([], [], '2026-06-11', 7);
    expect(v.hasData).toBe(false);
    expect(v.pnlPerDay.length).toBe(7);
    expect(v.pnlPerDay.every((p) => p === 0)).toBe(true);
    expect(v.totalPnl).toBe(0);
  });

  it('Fenster: from = today - (windowDays-1)', () => {
    const v = buildWmRoiVerlauf([], [], '2026-06-15', 7);
    expect(v.fromIso).toBe('2026-06-09');
    expect(v.toIso).toBe('2026-06-15');
    expect(v.dates[0]).toBe('2026-06-09');
    expect(v.dates[v.dates.length - 1]).toBe('2026-06-15');
  });

  it('Win mit Quote 2.0 + Stake 20 -> +20 am Spieltag', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'win' })
    ], [stake({ id: 'a', dateIso: '2026-06-12', stakeEur: 20, decimalOdds: 2.0 })], '2026-06-15', 7);
    expect(v.pnlPerDay[v.dates.indexOf('2026-06-12')]).toBe(20);
    expect(v.totalPnl).toBe(20);
  });

  it('Loss subtrahiert Einsatz', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'loss' })
    ], [stake({ id: 'a', dateIso: '2026-06-12', stakeEur: 30 })], '2026-06-15', 7);
    expect(v.pnlPerDay[v.dates.indexOf('2026-06-12')]).toBe(-30);
  });

  it('Push -> 0 PnL', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'push' })
    ], [stake({ id: 'a', dateIso: '2026-06-12' })], '2026-06-15', 7);
    expect(v.totalPnl).toBe(0);
  });

  it('Pending wird ignoriert', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'pending' })
    ], [stake({ id: 'a', dateIso: '2026-06-12' })], '2026-06-15', 7);
    expect(v.hasData).toBe(false);
  });

  it('Cumulative Kurve summiert ueber das Fenster', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'win' }),
      entry({ id: 'b', dateIso: '2026-06-13', outcome: 'loss' })
    ], [
      stake({ id: 'a', dateIso: '2026-06-12', stakeEur: 20, decimalOdds: 2.0 }),
      stake({ id: 'b', dateIso: '2026-06-13', stakeEur: 30 })
    ], '2026-06-15', 7);
    const idx12 = v.dates.indexOf('2026-06-12');
    const idx13 = v.dates.indexOf('2026-06-13');
    expect(v.cumulativePnl[idx12]).toBe(20);
    expect(v.cumulativePnl[idx13]).toBe(-10);
    expect(v.totalPnl).toBe(-10);
  });

  it('Ausserhalb des Fensters wird ignoriert', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-05-01', outcome: 'win' })
    ], [stake({ id: 'a', dateIso: '2026-05-01' })], '2026-06-15', 7);
    expect(v.hasData).toBe(false);
  });

  it('Stake fehlt -> kein Beitrag obwohl Win vorhanden', () => {
    const v = buildWmRoiVerlauf([entry({ id: 'a', outcome: 'win' })], [], '2026-06-11', 7);
    expect(v.totalPnl).toBe(0);
  });

  it('Tier-Trennung: Hoechste Konfluenz separat', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'win', tier: 'hoechste-konfluenz' }),
      entry({ id: 'b', dateIso: '2026-06-13', outcome: 'loss', tier: 'modell-favorit' })
    ], [
      stake({ id: 'a', dateIso: '2026-06-12', stakeEur: 20, decimalOdds: 2.0 }),
      stake({ id: 'b', dateIso: '2026-06-13', stakeEur: 30 })
    ], '2026-06-15', 7);
    expect(v.totalHoechsteKonfluenz).toBe(20);
    expect(v.totalModellFavorit).toBe(-30);
    expect(v.totalPnl).toBe(-10);
  });

  it('Cumulative pro Tier wachsen unabhaengig', () => {
    const v = buildWmRoiVerlauf([
      entry({ id: 'a', dateIso: '2026-06-12', outcome: 'win', tier: 'hoechste-konfluenz' }),
      entry({ id: 'b', dateIso: '2026-06-13', outcome: 'win', tier: 'hoechste-konfluenz' })
    ], [
      stake({ id: 'a', dateIso: '2026-06-12', stakeEur: 20, decimalOdds: 2.0 }),
      stake({ id: 'b', dateIso: '2026-06-13', stakeEur: 10, decimalOdds: 2.0 })
    ], '2026-06-15', 7);
    const idx13 = v.dates.indexOf('2026-06-13');
    expect(v.cumulativeHoechsteKonfluenz[idx13]).toBe(30);
    expect(v.cumulativeModellFavorit[idx13]).toBe(0);
  });
});
