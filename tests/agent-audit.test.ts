import { describe, expect, it } from 'vitest';
import { SPORT_FIRMA } from '@/lib/sport/firma/roster';
import { collectFirmaVotes, type MatchVoteContext } from '@/lib/sport/firma/employee-votes';
import { leagueLabelForKey } from '@/lib/sport/firma/league-key-mapping';
import { ALL_EMPLOYEES, runAllEmployees, derivateAnalyst, strategieAuswerter } from '@/lib/intel/employees';
import type { IntelContext } from '@/lib/intel/types';
import { CEO_BIOS, SUBAGENT_BIOS } from '@/lib/agents/personalities';
import { evaluateStockPersonas } from '@/lib/agents/stock-personas';
import { evaluateCommodityPersonas } from '@/lib/agents/commodity-personas';
import { evaluateFootballPersonas } from '@/lib/agents/football-personas';
import { evaluateWmPersonas } from '@/lib/agents/wm-personas';

const empty: IntelContext = {
  fearGreed: null, fundingBtcPct: null, fundingEthPct: null, btcDominancePct: null,
  marketMood: 'neutral', btcRegime: 'sideways', topCandidates: [],
  newsTotal: 0, newsBullish: 0, newsBearish: 0, newsTopHeadline: null, topCoinSentiment: [],
  backtestPeriodDays: 0, backtestSafeTrades: 0, backtestSafeWinRatePct: null, backtestSafeNetReturnPct: 0,
  nextHighImpactEvent: null, cycleLabel: null, cycleProgressPct: null, recentBuyDays: 0, recentWaitDays: 0
};
const context: MatchVoteContext = {
  fixture: { id: 'audit', homeTeam: 'Test Heim', awayTeam: 'Test Gast', league: 'Bundesliga', date: '2026-10-30', time: '19:30', venue: null, homeScore: null, awayScore: null, status: 'upcoming', prediction: null, probabilities: null, tips: null },
  leagueName: 'Bundesliga', homeForm: null, awayForm: null, h2h: null, leagueStats: null, finishedPool: []
};

describe('every sport employee', () => {
  it('has a unique ID and a complete profile', () => {
    expect(new Set(SPORT_FIRMA.map(e => e.id)).size).toBe(SPORT_FIRMA.length);
    expect(SPORT_FIRMA).toHaveLength(100);
  });
  for (const employee of SPORT_FIRMA) {
    it(`${employee.id}: missing evidence never creates a directional vote`, () => {
      expect(employee.name.trim()).not.toBe('');
      expect(employee.role.trim()).not.toBe('');
      const leagueName = employee.leagueKey ? leagueLabelForKey(employee.leagueKey)! : 'Bundesliga';
      const fixture = { ...context.fixture, homeTeam: employee.teamKey ?? 'Test Heim' };
      const vote = collectFirmaVotes({ ...context, leagueName, fixture }).votes.find(v => v.employeeId === employee.id);
      expect(vote, `No evaluator for ${employee.id}`).toBeDefined();
      expect(vote!.side).toBe('abstain');
      expect(Number.isFinite(vote!.confidence)).toBe(true);
      expect(vote!.reasoning.trim()).not.toBe('');
    });
    it(`${employee.id}: produces a finite, explained vote with a valid model`, () => {
      const leagueName = employee.leagueKey ? leagueLabelForKey(employee.leagueKey)! : 'Bundesliga';
      const fixture = { ...context.fixture, homeTeam: employee.teamKey ?? 'Test Heim', prediction: {
        lambdaHome: 2.5, lambdaAway: 0.5, pHome: 0.78, pDraw: 0.15, pAway: 0.07,
        likelyScore: { home: 2, away: 0 }, homeGames: 50, awayGames: 50,
        pickSide: 'home' as const, pickConfidence: 0.78, pickLabel: 'klar' as const, pickPlain: 'Heimsieg',
        homeForm: { results: [], goalsFor: 0, goalsAgainst: 0 }, awayForm: { results: [], goalsFor: 0, goalsAgainst: 0 }
      } };
      const homeForm = { team: fixture.homeTeam, league: leagueName, wins: 5, draws: 0, losses: 0, played: 5, goalsFor: 15, goalsAgainst: 2, goalDiff: 13, points: 15, streak: 5, sequence: ['W' as const] };
      const awayForm = { ...homeForm, team: fixture.awayTeam, wins: 0, losses: 5, points: 0, streak: -5, goalsFor: 2, goalsAgainst: 15, goalDiff: -13 };
      const leagueStats = { league: leagueName, played: 600, totalGoals: 1800, goalsPerMatch: 3, homeWinPct: 45, drawPct: 25, awayWinPct: 30, homeGoalsPerMatch: 1.7, awayGoalsPerMatch: 1.3, bttsPct: 60, over25Pct: 55 };
      const vote = collectFirmaVotes({ ...context, fixture, leagueName, homeForm, awayForm, leagueStats }).votes.find(v => v.employeeId === employee.id);
      expect(vote).toBeDefined();
      expect(Number.isFinite(vote!.confidence)).toBe(true);
      expect(vote!.confidence).toBeGreaterThanOrEqual(0);
      expect(vote!.confidence).toBeLessThanOrEqual(1);
      expect(['home', 'away', 'draw', 'abstain']).toContain(vote!.side);
      expect(vote!.reasoning).not.toMatch(/undefined|NaN/);
    });
    if (employee.leagueKey) it(`${employee.id}: stays within its assigned league`, () => {
      const foreignLeague = employee.leagueKey === 'BL' ? 'Premier League' : 'Bundesliga';
      expect(collectFirmaVotes({ ...context, leagueName: foreignLeague }).votes.some(v => v.employeeId === employee.id)).toBe(false);
    });
  }
});
describe('every research specialist', () => {
  for (const [i, employee] of ALL_EMPLOYEES.entries()) it(`specialist ${i + 1}: reports absent data explicitly`, () => {
    const report = employee(empty);
    expect(report.signal).toBe('kein_signal');
    expect(report.confidence).toBe('keine_daten');
    expect(report.finding).not.toMatch(/undefined|NaN/);
  });
  it('all research IDs are unique', () => {
    const reports = runAllEmployees(empty);
    expect(reports).toHaveLength(12);
    expect(new Set(reports.map(r => r.id)).size).toBe(12);
  });
  it('uses a single available negative funding rate without inventing a zero', () => {
    const report = derivateAnalyst({ ...empty, fundingBtcPct: -2 });
    expect(report.signal).toBe('risk-on');
    expect(report.finding).not.toContain('undefined');
  });
  it('distinguishes a valid zero-trade backtest from absent history', () => {
    expect(strategieAuswerter(empty).confidence).toBe('keine_daten');
    expect(strategieAuswerter({ ...empty, backtestPeriodDays: 30 }).confidence).toBe('sicher');
  });
});
describe('company and cross-asset profiles', () => {
  for (const id of ['conservative', 'balanced', 'aggressive'] as const) it(`${id}: CEO and all seven specialists have complete profiles`, () => {
    const team = Object.values(SUBAGENT_BIOS[id]);
    expect(team).toHaveLength(7);
    for (const profile of [CEO_BIOS[id], ...team]) for (const field of ['name', 'role', 'bio', 'quote'] as const) expect(profile[field].trim()).not.toBe('');
  });
  for (const [name, evaluate] of [['stocks', () => evaluateStockPersonas([])], ['commodities', () => evaluateCommodityPersonas([])], ['football', () => evaluateFootballPersonas([], '2026-10-30')], ['world-cup', () => evaluateWmPersonas('2026-10-30')]] as const) it(`${name}: all three personas wait without an eligible target`, () => {
    const verdicts = evaluate();
    expect(verdicts).toHaveLength(3);
    for (const v of verdicts) { expect(v.target).toBeNull(); expect(v.verdict).toBe('WARTEN'); }
  });
});
