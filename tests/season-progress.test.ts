import { describe, expect, it } from 'vitest';
import { leagueSeasonProgress } from '@/lib/sport/season-progress';
import type { Fixture, LeagueFixtures } from '@/lib/sport/fetcher';

function fx(id: string): Fixture {
  return {
    id, homeTeam: 'A', awayTeam: 'B', league: 'L',
    date: '2026-05-01', time: null, venue: null,
    homeScore: 1, awayScore: 1, status: 'finished'
  };
}

function lf(name: string, finishedCount: number): LeagueFixtures {
  return {
    league: { id: name, name, country: 'X' },
    next: [],
    last: Array.from({ length: finishedCount }, (_, i) => fx(`${i}`))
  };
}

describe('leagueSeasonProgress', () => {
  it('Pause bei 0 finished', () => {
    expect(leagueSeasonProgress(lf('Premier League', 0)).phase).toBe('Pause');
  });

  it('Saisonstart bei wenigen Spielen', () => {
    expect(leagueSeasonProgress(lf('Bundesliga', 15)).phase).toBe('Saisonstart');
  });

  it('Hinrunde bei ~25%', () => {
    expect(leagueSeasonProgress(lf('La Liga', 80)).phase).toBe('Hinrunde');
  });

  it('Endspurt bei ~85%', () => {
    expect(leagueSeasonProgress(lf('Premier League', 290)).phase).toBe('Endspurt');
  });

  it('beendet bei ≥ 95%', () => {
    expect(leagueSeasonProgress(lf('Premier League', 340)).phase).toBe('beendet');
  });

  it('kleinere Ligen bekommen kleineren Estimator', () => {
    const p1 = leagueSeasonProgress(lf('Premier League', 100));
    const p2 = leagueSeasonProgress(lf('LigaXY', 100));
    expect(p1.estimatedTotal).toBeGreaterThan(p2.estimatedTotal);
    expect(p2.percent).toBeGreaterThan(p1.percent);
  });
});
