import { describe, expect, it } from 'vitest';
import {
  computeRefereeTendencies,
  computeRefereeImpact
} from '@/lib/sport/referee-tendencies';
import type { Fixture } from '@/lib/sport/fetcher';

function past(home: string, away: string, hs: number, as_: number, ref: string | null = null, date = '2026-05-01'): Fixture {
  return {
    id: `${home}-${away}-${date}-${ref ?? 'x'}-${Math.random()}`,
    homeTeam: home, awayTeam: away,
    league: 'L', date, time: null, venue: null,
    homeScore: hs, awayScore: as_,
    status: 'finished',
    referee: ref
  };
}

function pool(refGames: number, refGoalAvg: number, refHomeWinRate: number, leagueGames: number, leagueGoalAvg: number, leagueHomeWinRate: number): Fixture[] {
  const out: Fixture[] = [];
  // Spiele mit unserem Referee X
  for (let i = 0; i < refGames; i++) {
    const homeWin = i < Math.round(refGames * refHomeWinRate);
    const totalGoals = refGoalAvg + (i % 2 === 0 ? 0.4 : -0.4);
    const home = homeWin ? Math.ceil(totalGoals * 0.65) : Math.floor(totalGoals * 0.35);
    const away = Math.max(0, Math.round(totalGoals - home));
    out.push(past(`H${i}`, `A${i}`, home, away, 'Hans Mueller', `2026-04-${String((i % 28) + 1).padStart(2, '0')}`));
  }
  // Liga-Spiele mit ANDEREN Schiris
  for (let i = 0; i < leagueGames; i++) {
    const homeWin = i < Math.round(leagueGames * leagueHomeWinRate);
    const totalGoals = leagueGoalAvg + (i % 2 === 0 ? 0.3 : -0.3);
    const home = homeWin ? Math.ceil(totalGoals * 0.6) : Math.floor(totalGoals * 0.4);
    const away = Math.max(0, Math.round(totalGoals - home));
    out.push(past(`H${i}`, `A${i}`, home, away, `Ref-${i}`, `2026-03-${String((i % 28) + 1).padStart(2, '0')}`));
  }
  return out;
}

describe('computeRefereeTendencies', () => {
  it('null/leerer Schiri → null', () => {
    expect(computeRefereeTendencies(null, [])).toBeNull();
    expect(computeRefereeTendencies('', [])).toBeNull();
    expect(computeRefereeTendencies('  ', [])).toBeNull();
  });

  it('< 8 Schiri-Spiele → null (zu wenig Daten)', () => {
    const games: Fixture[] = [];
    for (let i = 0; i < 5; i++) games.push(past('A', 'B', 1, 1, 'Hans Mueller'));
    for (let i = 0; i < 50; i++) games.push(past('A', 'B', 1, 1, 'Other'));
    expect(computeRefereeTendencies('Hans Mueller', games)).toBeNull();
  });

  it('< 30 Liga-Spiele → null (Referenz-Pool zu duenn)', () => {
    const games: Fixture[] = [];
    for (let i = 0; i < 12; i++) games.push(past('A', 'B', 2, 1, 'Hans Mueller'));
    expect(computeRefereeTendencies('Hans Mueller', games)).toBeNull();
  });

  it('Case-insensitiv match', () => {
    const games = pool(10, 2.5, 0.5, 40, 2.5, 0.5);
    const t = computeRefereeTendencies('HANS MUELLER', games);
    expect(t).not.toBeNull();
    expect(t!.name).toBe('HANS MUELLER');
    expect(t!.games).toBe(10);
  });

  it('Tor-Schnitt + Heim-Quote werden ermittelt', () => {
    const games = pool(10, 3.5, 0.55, 60, 2.7, 0.45);
    const t = computeRefereeTendencies('Hans Mueller', games);
    expect(t).not.toBeNull();
    expect(t!.games).toBe(10);
    expect(t!.avgGoalsPerGame).toBeGreaterThan(2.7);
    expect(t!.leagueAvgGoalsPerGame).toBeLessThan(t!.avgGoalsPerGame);
    expect(t!.homeWinRate).toBeGreaterThan(t!.leagueHomeWinRate);
  });

  it('Tor-armer Schiri → summary erwaehnt das', () => {
    const games = pool(10, 1.6, 0.5, 60, 2.5, 0.5);
    const t = computeRefereeTendencies('Hans Mueller', games);
    expect(t!.summary).toContain('tor-arm');
  });

  it('Tor-reicher Schiri → summary erwaehnt das', () => {
    const games = pool(10, 3.8, 0.5, 60, 2.5, 0.5);
    const t = computeRefereeTendencies('Hans Mueller', games);
    expect(t!.summary).toContain('tor-reich');
  });
});

describe('computeRefereeImpact', () => {
  it('null → neutral', () => {
    const impact = computeRefereeImpact(null);
    expect(impact.lambdaMul).toBe(1);
    expect(impact.homeBiasMul).toBe(1);
    expect(impact.awayBiasMul).toBe(1);
    expect(impact.factors).toEqual([]);
  });

  it('Tor-arm + Heim-Bias unter Liga → lambdaMul runter, awayBias hoch', () => {
    const impact = computeRefereeImpact({
      name: 'X', games: 10,
      avgGoalsPerGame: 1.8, leagueAvgGoalsPerGame: 2.5,
      homeWinRate: 30, leagueHomeWinRate: 45,
      summary: 'x'
    });
    expect(impact.lambdaMul).toBeLessThan(1);
    expect(impact.homeBiasMul).toBeLessThan(1);
    expect(impact.awayBiasMul).toBeGreaterThan(1);
    expect(impact.factors.length).toBeGreaterThanOrEqual(2);
  });

  it('Tor-reich + Heim-Bias ueber Liga → lambdaMul hoch, homeBias hoch', () => {
    const impact = computeRefereeImpact({
      name: 'X', games: 12,
      avgGoalsPerGame: 3.2, leagueAvgGoalsPerGame: 2.5,
      homeWinRate: 60, leagueHomeWinRate: 45,
      summary: 'x'
    });
    expect(impact.lambdaMul).toBeGreaterThan(1);
    expect(impact.homeBiasMul).toBeGreaterThan(1);
    expect(impact.awayBiasMul).toBeLessThan(1);
  });

  it('Innerhalb der Schwellen → neutral', () => {
    const impact = computeRefereeImpact({
      name: 'X', games: 10,
      avgGoalsPerGame: 2.6, leagueAvgGoalsPerGame: 2.5,
      homeWinRate: 47, leagueHomeWinRate: 45,
      summary: 'x'
    });
    expect(impact.lambdaMul).toBe(1);
    expect(impact.homeBiasMul).toBe(1);
    expect(impact.factors).toEqual([]);
  });

  it('Effekte sind moderat (≤ 5 % auf lambda, ≤ 3 % auf bias)', () => {
    const impact = computeRefereeImpact({
      name: 'X', games: 12,
      avgGoalsPerGame: 5.0, leagueAvgGoalsPerGame: 2.0,
      homeWinRate: 80, leagueHomeWinRate: 40,
      summary: 'x'
    });
    expect(impact.lambdaMul).toBeLessThanOrEqual(1.05);
    expect(impact.homeBiasMul).toBeLessThanOrEqual(1.03);
    expect(impact.awayBiasMul).toBeGreaterThanOrEqual(0.97);
  });
});
