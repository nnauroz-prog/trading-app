import { Fixture } from '@/lib/sport/fetcher';
import type { WeatherImpact } from '@/lib/sport/weather-impact';

export interface MatchPrediction {
  lambdaHome: number;
  lambdaAway: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  likelyScore: { home: number; away: number };
  homeGames: number;
  awayGames: number;
  // Plain-language interpretation, computed once on the server.
  pickSide: 'home' | 'away' | 'draw';
  pickConfidence: number; // share of the winning side, 0..1
  pickLabel: 'klar' | 'leicht' | 'offen';
  pickPlain: string; // e.g. "klar Bayern" or "offen, leicht Bayer"
  homeForm: TeamForm5;
  awayForm: TeamForm5;
  // Optionaler Wetter-Modifier. Wenn vorhanden, sind lambdaHome/lambdaAway
  // bereits damit multipliziert. Das Feld erklaert den Effekt + erlaubt
  // dem UI, das Wetter zu zeigen.
  weather?: WeatherImpact;
}

export interface TeamForm5 {
  results: ('W' | 'D' | 'L')[]; // up to last 5, oldest first
  goalsFor: number;
  goalsAgainst: number;
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

// Most recent N finished games' results from the team's perspective,
// ordered oldest → newest so the UI can render left-to-right.
function recentResults(team: string, finished: Fixture[], n = 5): TeamForm5 {
  const games = finished
    .filter((e) => e.status === 'finished' && e.homeScore !== null && e.awayScore !== null && (e.homeTeam === team || e.awayTeam === team))
    .sort((a, b) => b.date.localeCompare(a.date)) // newest first
    .slice(0, n)
    .reverse(); // oldest first for display
  const results: ('W' | 'D' | 'L')[] = [];
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const g of games) {
    const isHome = g.homeTeam === team;
    const myGoals = isHome ? (g.homeScore ?? 0) : (g.awayScore ?? 0);
    const oppGoals = isHome ? (g.awayScore ?? 0) : (g.homeScore ?? 0);
    goalsFor += myGoals;
    goalsAgainst += oppGoals;
    results.push(myGoals > oppGoals ? 'W' : myGoals < oppGoals ? 'L' : 'D');
  }
  return { results, goalsFor, goalsAgainst };
}

function plainLabel(pHome: number, pDraw: number, pAway: number, homeTeam: string, awayTeam: string): { side: 'home' | 'away' | 'draw'; label: 'klar' | 'leicht' | 'offen'; plain: string; confidence: number } {
  const max = Math.max(pHome, pDraw, pAway);
  const side: 'home' | 'away' | 'draw' = pHome === max ? 'home' : pAway === max ? 'away' : 'draw';
  const sideName = side === 'home' ? homeTeam : side === 'away' ? awayTeam : 'Remis';

  const label: 'klar' | 'leicht' | 'offen' =
    max >= 0.55 ? 'klar' :
    max >= 0.42 ? 'leicht' :
    'offen';

  const plain =
    label === 'klar' ? `klar ${sideName}` :
    label === 'leicht' ? `leicht ${sideName}` :
    `offen, leichter Tipp ${sideName}`;

  return { side, label, plain, confidence: max };
}

// Predict an upcoming match using a simple Poisson model fed by each team's
// recent form (goals scored / conceded) in the same league. Conversational
// tool — not for betting. Returns null when there isn't enough data.
// Wenn weather uebergeben wird, werden lambdaHome/lambdaAway gleichgewichtet
// mit dem weather-multiplier multipliziert (Wetter trifft beide Teams).
export function predictMatch(homeTeam: string, awayTeam: string, finishedLeagueEvents: Fixture[], weather?: WeatherImpact): MatchPrediction | null {
  const homeForm = formFor(homeTeam, finishedLeagueEvents);
  const awayForm = formFor(awayTeam, finishedLeagueEvents);
  if (homeForm.games < 2 || awayForm.games < 2) return null;

  const homeAvgScored = homeForm.goalsScored / homeForm.games;
  const homeAvgConceded = homeForm.goalsConceded / homeForm.games;
  const awayAvgScored = awayForm.goalsScored / awayForm.games;
  const awayAvgConceded = awayForm.goalsConceded / awayForm.games;

  const weatherMul = weather?.lambdaMultiplier ?? 1.0;
  const lambdaHome = (Math.max(0.1, ((homeAvgScored + awayAvgConceded) / 2) * HOME_ADVANTAGE) || LEAGUE_AVG_GOALS) * weatherMul;
  const lambdaAway = (Math.max(0.1, (awayAvgScored + homeAvgConceded) / 2) || LEAGUE_AVG_GOALS) * weatherMul;

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
  const pHomeNorm = pH / total;
  const pDrawNorm = pD / total;
  const pAwayNorm = pA / total;
  const plain = plainLabel(pHomeNorm, pDrawNorm, pAwayNorm, homeTeam, awayTeam);

  return {
    lambdaHome,
    lambdaAway,
    pHome: pHomeNorm,
    pDraw: pDrawNorm,
    pAway: pAwayNorm,
    likelyScore,
    homeGames: homeForm.games,
    awayGames: awayForm.games,
    pickSide: plain.side,
    pickConfidence: plain.confidence,
    pickLabel: plain.label,
    pickPlain: plain.plain,
    homeForm: recentResults(homeTeam, finishedLeagueEvents),
    awayForm: recentResults(awayTeam, finishedLeagueEvents),
    weather: weather ?? undefined
  };
}
