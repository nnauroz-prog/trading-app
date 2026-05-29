import { Fixture } from '@/lib/sport/fetcher';

export interface MatchPrediction {
  lambdaHome: number;
  lambdaAway: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  likelyScore: { home: number; away: number };
  homeGames: number;
  awayGames: number;
}

const HOME_ADVANTAGE = 1.15;
const MAX_GOALS = 6;
const LEAGUE_AVG_GOALS = 1.4; // fallback per side per match

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial;
}

interface TeamForm {
  goalsScored: number;
  goalsConceded: number;
  games: number;
}

function formFor(team: string, finished: Fixture[]): TeamForm {
  let goalsScored = 0;
  let goalsConceded = 0;
  let games = 0;
  for (const e of finished) {
    if (e.status !== 'finished' || e.homeScore === null || e.awayScore === null) continue;
    if (e.homeTeam === team) {
      goalsScored += e.homeScore;
      goalsConceded += e.awayScore;
      games++;
    } else if (e.awayTeam === team) {
      goalsScored += e.awayScore;
      goalsConceded += e.homeScore;
      games++;
    }
  }
  return { goalsScored, goalsConceded, games };
}

// Predict an upcoming match using a simple Poisson model fed by each team's
// recent form (goals scored / conceded) in the same league. Conversational
// tool — not for betting. Returns null when there isn't enough data.
export function predictMatch(homeTeam: string, awayTeam: string, finishedLeagueEvents: Fixture[]): MatchPrediction | null {
  const homeForm = formFor(homeTeam, finishedLeagueEvents);
  const awayForm = formFor(awayTeam, finishedLeagueEvents);
  if (homeForm.games < 2 || awayForm.games < 2) return null;

  const homeAvgScored = homeForm.goalsScored / homeForm.games;
  const homeAvgConceded = homeForm.goalsConceded / homeForm.games;
  const awayAvgScored = awayForm.goalsScored / awayForm.games;
  const awayAvgConceded = awayForm.goalsConceded / awayForm.games;

  const lambdaHome = Math.max(0.1, ((homeAvgScored + awayAvgConceded) / 2) * HOME_ADVANTAGE) || LEAGUE_AVG_GOALS;
  const lambdaAway = Math.max(0.1, (awayAvgScored + homeAvgConceded) / 2) || LEAGUE_AVG_GOALS;

  let pH = 0;
  let pD = 0;
  let pA = 0;
  let bestProb = 0;
  let likelyScore = { home: 0, away: 0 };

  for (let h = 0; h <= MAX_GOALS; h++) {
    const ph = poissonPmf(h, lambdaHome);
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph * poissonPmf(a, lambdaAway);
      if (p > bestProb) {
        bestProb = p;
        likelyScore = { home: h, away: a };
      }
      if (h > a) pH += p;
      else if (h < a) pA += p;
      else pD += p;
    }
  }

  const total = pH + pD + pA;
  return {
    lambdaHome,
    lambdaAway,
    pHome: pH / total,
    pDraw: pD / total,
    pAway: pA / total,
    likelyScore,
    homeGames: homeForm.games,
    awayGames: awayForm.games
  };
}
