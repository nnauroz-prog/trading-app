import { Fixture } from '@/lib/sport/fetcher';
import type { WeatherImpact } from '@/lib/sport/weather-impact';
import { computeH2hModifier, type HeadToHeadResult } from '@/lib/sport/h2h';
import { computeRefereeImpact, computeRefereeTendencies } from '@/lib/sport/referee-tendencies';

export type ModelConfidence = 'low' | 'medium' | 'high';
export type DataQuality = 'weak' | 'medium' | 'good';

export interface HeadToHead {
  totalGames: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  recentResults: Array<{ date: string; score: string; winner: 'home' | 'draw' | 'away' }>;
}

export interface FootballProbabilityModel {
  // 1X2
  homeWin: number;
  draw: number;
  awayWin: number;
  // Tore
  over05: number;
  over15: number;
  over25: number;
  under25: number;
  bothTeamsToScore: number;
  bothTeamsNotToScore: number;
  // Top 3 Ergebnisse
  topScorelines: Array<{ score: string; probability: number }>;
  // Erwartete Tore (Modell-Lambda)
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  // Datenbasis-Info
  homeGamesUsed: number;
  awayGamesUsed: number;
  modelConfidence: ModelConfidence;
  dataQuality: DataQuality;
  explanation: string;
  headToHead: HeadToHead;
}

const HOME_ADVANTAGE = 1.15;
const MAX_GOALS = 6;
const FALLBACK_LEAGUE_AVG = 1.4;

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

function leagueAverageGoals(finished: Fixture[]): number {
  let totalGoals = 0;
  let games = 0;
  for (const e of finished) {
    if (e.status !== 'finished' || e.homeScore === null || e.awayScore === null) continue;
    totalGoals += e.homeScore + e.awayScore;
    games++;
  }
  if (games < 5) return FALLBACK_LEAGUE_AVG * 2; // home+away combined fallback
  return totalGoals / games;
}

function computeHeadToHead(homeTeam: string, awayTeam: string, finished: Fixture[]): HeadToHead {
  const meetings = finished
    .filter((e) => e.status === 'finished' && e.homeScore !== null && e.awayScore !== null)
    .filter((e) => (e.homeTeam === homeTeam && e.awayTeam === awayTeam) || (e.homeTeam === awayTeam && e.awayTeam === homeTeam))
    .sort((a, b) => b.date.localeCompare(a.date));

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  const recentResults: HeadToHead['recentResults'] = [];
  for (const m of meetings) {
    const isHomeHome = m.homeTeam === homeTeam;
    const myGoals = isHomeHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const oppGoals = isHomeHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    let winner: 'home' | 'draw' | 'away';
    if (myGoals > oppGoals) { homeWins++; winner = 'home'; }
    else if (myGoals < oppGoals) { awayWins++; winner = 'away'; }
    else { draws++; winner = 'draw'; }
    if (recentResults.length < 5) {
      recentResults.push({
        date: m.date,
        score: `${m.homeScore}:${m.awayScore}`,
        winner: isHomeHome ? winner : (winner === 'home' ? 'away' : winner === 'away' ? 'home' : 'draw')
      });
    }
  }

  return { totalGames: meetings.length, homeWins, draws, awayWins, recentResults };
}

function classifyDataQuality(homeGames: number, awayGames: number): DataQuality {
  const min = Math.min(homeGames, awayGames);
  if (min >= 8) return 'good';
  if (min >= 4) return 'medium';
  return 'weak';
}

function classifyModelConfidence(quality: DataQuality, decisiveness: number): ModelConfidence {
  // decisiveness: how far is the top 1X2 outcome from a 33/33/33 baseline?
  if (quality === 'good' && decisiveness >= 0.18) return 'high';
  if (quality === 'good' || (quality === 'medium' && decisiveness >= 0.15)) return 'medium';
  return 'low';
}

// Builds a full probability model for an upcoming match using a Poisson
// distribution fed by each team's recent league form. Returns null if there
// is literally no usable form data at all (both teams unknown).
//
// Wenn weather, h2h oder refereeName mitkommen, fliessen die gleichen
// Modifier wie in predictMatch (Wetter * H2H-Multiplier * Schiri) durch —
// damit der Safe-Tips-Ranker exakt dieselbe Sichtweise hat wie die UI-
// Prognose.
export function computeFootballProbabilities(
  homeTeam: string,
  awayTeam: string,
  finishedLeagueEvents: Fixture[],
  weather?: WeatherImpact,
  h2h?: HeadToHeadResult,
  refereeName?: string | null
): FootballProbabilityModel | null {
  const home = formFor(homeTeam, finishedLeagueEvents);
  const away = formFor(awayTeam, finishedLeagueEvents);

  if (home.games === 0 && away.games === 0) return null;

  const leagueAvg = leagueAverageGoals(finishedLeagueEvents); // total goals per match
  const leaguePerSide = leagueAvg / 2;

  const homeAvgScored = home.games > 0 ? home.goalsScored / home.games : leaguePerSide;
  const homeAvgConceded = home.games > 0 ? home.goalsConceded / home.games : leaguePerSide;
  const awayAvgScored = away.games > 0 ? away.goalsScored / away.games : leaguePerSide;
  const awayAvgConceded = away.games > 0 ? away.goalsConceded / away.games : leaguePerSide;

  const weatherMul = weather?.lambdaMultiplier ?? 1.0;
  const h2hMod = h2h ? computeH2hModifier(h2h) : undefined;
  const homeH2hMul = h2hMod?.homeMultiplier ?? 1.0;
  const awayH2hMul = h2hMod?.awayMultiplier ?? 1.0;
  const refTendencies = refereeName ? computeRefereeTendencies(refereeName, finishedLeagueEvents) : null;
  const refImpact = computeRefereeImpact(refTendencies);

  // Blend each team's attack with the opponent's defence, then apply home advantage
  // PLUS alle Modifier (gleichgewichtet auf beide via weather/refImpact.lambdaMul,
  // asymmetrisch via h2h-Multiplier + refImpact home/away bias).
  const expectedHomeGoals = Math.max(0.15, ((homeAvgScored + awayAvgConceded) / 2) * HOME_ADVANTAGE) * weatherMul * homeH2hMul * refImpact.lambdaMul * refImpact.homeBiasMul;
  const expectedAwayGoals = Math.max(0.15, (awayAvgScored + homeAvgConceded) / 2) * weatherMul * awayH2hMul * refImpact.lambdaMul * refImpact.awayBiasMul;

  // Joint score matrix.
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let over05 = 0;
  let over15 = 0;
  let over25 = 0;
  let btts = 0;
  const scorelines: Array<{ score: string; probability: number }> = [];

  let totalProb = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    const ph = poissonPmf(h, expectedHomeGoals);
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph * poissonPmf(a, expectedAwayGoals);
      totalProb += p;
      scorelines.push({ score: `${h}:${a}`, probability: p });
      if (h > a) pHome += p;
      else if (h < a) pAway += p;
      else pDraw += p;
      const totalGoals = h + a;
      if (totalGoals >= 1) over05 += p;
      if (totalGoals >= 2) over15 += p;
      if (totalGoals >= 3) over25 += p;
      if (h >= 1 && a >= 1) btts += p;
    }
  }

  // Normalise — Poisson tail beyond MAX_GOALS is small but non-zero.
  const norm = totalProb > 0 ? totalProb : 1;
  pHome /= norm; pDraw /= norm; pAway /= norm;
  over05 /= norm; over15 /= norm; over25 /= norm; btts /= norm;
  for (const s of scorelines) s.probability /= norm;
  scorelines.sort((a, b) => b.probability - a.probability);

  const top1 = Math.max(pHome, pDraw, pAway);
  const decisiveness = top1 - (1 / 3);

  const dataQuality = classifyDataQuality(home.games, away.games);
  const modelConfidence = classifyModelConfidence(dataQuality, decisiveness);

  const explanation = explanationFor({
    quality: dataQuality, confidence: modelConfidence,
    homeGames: home.games, awayGames: away.games,
    expectedHomeGoals, expectedAwayGoals
  });

  return {
    homeWin: pHome,
    draw: pDraw,
    awayWin: pAway,
    over05,
    over15,
    over25,
    under25: 1 - over25,
    bothTeamsToScore: btts,
    bothTeamsNotToScore: 1 - btts,
    topScorelines: scorelines.slice(0, 3),
    expectedHomeGoals,
    expectedAwayGoals,
    homeGamesUsed: home.games,
    awayGamesUsed: away.games,
    modelConfidence,
    dataQuality,
    explanation,
    headToHead: computeHeadToHead(homeTeam, awayTeam, finishedLeagueEvents)
  };
}

function explanationFor(input: {
  quality: DataQuality;
  confidence: ModelConfidence;
  homeGames: number;
  awayGames: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
}): string {
  const dataNote =
    input.quality === 'weak' ? 'Datenlage schwach — Modell-Schätzung grob.' :
    input.quality === 'medium' ? 'Datenlage durchschnittlich.' :
    'Datenlage gut.';
  const confidenceNote =
    input.confidence === 'low' ? 'Confidence niedrig.' :
    input.confidence === 'medium' ? 'Confidence mittel.' :
    'Confidence hoch.';
  return `Erwartete Tore: Heim ${input.expectedHomeGoals.toFixed(2)}, Auswärts ${input.expectedAwayGoals.toFixed(2)} (basierend auf ${input.homeGames} bzw. ${input.awayGames} letzten Liga-Spielen). ${dataNote} ${confidenceNote}`;
}
