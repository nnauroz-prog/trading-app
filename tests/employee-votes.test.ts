import { describe, expect, it } from 'vitest';
import { collectFirmaVotes, type MatchVoteContext } from '@/lib/sport/firma/employee-votes';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

function strongHomeFixture(): UpcomingFixture {
  return {
    id: 'fx1',
    homeTeam: 'FC Bayern München', awayTeam: 'Schwacher SC',
    league: 'Bundesliga', date: '2026-08-01', time: '15:30', venue: null,
    homeScore: null, awayScore: null, status: 'upcoming',
    prediction: {
      lambdaHome: 2.5, lambdaAway: 0.5,
      pHome: 0.78, pDraw: 0.15, pAway: 0.07,
      likelyScore: { home: 2, away: 0 }, homeGames: 50, awayGames: 50,
      pickSide: 'home', pickConfidence: 0.78, pickLabel: 'klar', pickPlain: 'klar Bayern',
      homeForm: { results: [], goalsFor: 0, goalsAgainst: 0 },
      awayForm: { results: [], goalsFor: 0, goalsAgainst: 0 }
    },
    probabilities: null,
    tips: null
  };
}

describe('collectFirmaVotes', () => {
  it('returns a non-empty list of employee votes for a real fixture', () => {
    const ctx: MatchVoteContext = {
      fixture: strongHomeFixture(),
      leagueName: 'Bundesliga',
      homeForm: { team: 'FC Bayern München', league: 'Bundesliga', wins: 5, draws: 0, losses: 0, played: 5, goalsFor: 12, goalsAgainst: 2, goalDiff: 10, points: 15, streak: 5, sequence: ['W','W','W','W','W'] },
      awayForm: { team: 'Schwacher SC', league: 'Bundesliga', wins: 0, draws: 1, losses: 4, played: 5, goalsFor: 2, goalsAgainst: 12, goalDiff: -10, points: 1, streak: -4, sequence: ['L','L','L','L','D'] },
      h2h: { homeTeam: 'FC Bayern München', awayTeam: 'Schwacher SC', meetings: 5, winsForHome: 5, draws: 0, winsForAway: 0, goalsForHome: 18, goalsForAway: 3, lastMeeting: null, atHomeVenue: { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 }, recent5: { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 } },
      leagueStats: { league: 'Bundesliga', played: 600, totalGoals: 1800, goalsPerMatch: 3.0, homeWinPct: 45, drawPct: 25, awayWinPct: 30, homeGoalsPerMatch: 1.7, awayGoalsPerMatch: 1.3, bttsPct: 60, over25Pct: 55 },
      finishedPool: []
    };
    const result = collectFirmaVotes(ctx);
    expect(result.votes.length).toBeGreaterThan(20); // mindestens 20 Mitarbeiter melden sich
  });

  it('a strong home favourite gets predominantly home votes', () => {
    const ctx: MatchVoteContext = {
      fixture: strongHomeFixture(),
      leagueName: 'Bundesliga',
      homeForm: { team: 'FC Bayern München', league: 'Bundesliga', wins: 5, draws: 0, losses: 0, played: 5, goalsFor: 15, goalsAgainst: 1, goalDiff: 14, points: 15, streak: 5, sequence: ['W','W','W','W','W'] },
      awayForm: { team: 'Schwacher SC', league: 'Bundesliga', wins: 0, draws: 0, losses: 5, played: 5, goalsFor: 1, goalsAgainst: 15, goalDiff: -14, points: 0, streak: -5, sequence: ['L','L','L','L','L'] },
      h2h: { homeTeam: 'FC Bayern München', awayTeam: 'Schwacher SC', meetings: 5, winsForHome: 5, draws: 0, winsForAway: 0, goalsForHome: 20, goalsForAway: 2, lastMeeting: null, atHomeVenue: { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 }, recent5: { meetings: 0, winsForHome: 0, draws: 0, winsForAway: 0, goalsForHome: 0, goalsForAway: 0 } },
      leagueStats: { league: 'Bundesliga', played: 600, totalGoals: 1800, goalsPerMatch: 3.0, homeWinPct: 45, drawPct: 25, awayWinPct: 30, homeGoalsPerMatch: 1.7, awayGoalsPerMatch: 1.3, bttsPct: 60, over25Pct: 55 },
      finishedPool: []
    };
    const r = collectFirmaVotes(ctx);
    expect(r.consensusSide).toBe('home');
    expect(r.homeVotes).toBeGreaterThan(r.awayVotes);
  });

  it('abstain votes are tracked separately', () => {
    const ctx: MatchVoteContext = {
      fixture: strongHomeFixture(),
      leagueName: 'Unbekannt',
      homeForm: null, awayForm: null, h2h: null, leagueStats: null, finishedPool: []
    };
    const r = collectFirmaVotes(ctx);
    expect(r.abstainVotes).toBeGreaterThan(0);
  });
});
