// Schiedsrichter-Tendenzen aus einem Pool vergangener Spiele berechnen.
// TheSportsDB liefert strReferee fuer einen Teil der Top-5-Liga-Spiele.
// Wenn fuer den Schiri des kommenden Spiels >= MIN_GAMES Begegnungen in
// derselben Liga vorliegen, koennen wir robust messen:
//   - Durchschnittliche Tore pro Spiel (gegen Liga-Schnitt verglichen)
//   - Heim-Sieg-Quote (gegen Liga-Schnitt verglichen)
//
// Beide Signale haben moderate Wirkung. Studien (z.B. Dohmen 2008,
// Buraimo et al. 2010) zeigen, dass Schiri-Heim-Bias real ist, aber
// klein — meist 2-5 Prozentpunkte. Tor-Tendenz ist im Schnitt deutlich
// schwaecher, kann aber bei bekannten „Karten-Schiris" 5-10 % vom
// Tor-Erwartungswert wegnehmen (mehr Standards, weniger Flow).
//
// Wir bleiben konservativ: maximal +/-5 % auf lambdas, +/-3 % auf Home-
// Win-Anteil. Nur ab MIN_GAMES = 8 wirksam.

import type { Fixture } from '@/lib/sport/fetcher';

export interface RefereeTendencies {
  name: string;
  games: number;
  avgGoalsPerGame: number;
  leagueAvgGoalsPerGame: number;
  homeWinRate: number;
  leagueHomeWinRate: number;
  // Klartext-Beschreibung der Tendenz, fuer UI-Anzeige.
  summary: string;
}

export interface RefereeImpact {
  lambdaMul: number;       // gleichgewichtet auf beide Seiten
  homeBiasMul: number;     // zusaetzlich auf lambdaHome
  awayBiasMul: number;     // zusaetzlich auf lambdaAway
  factors: string[];
}

const MIN_GAMES = 8;
const MIN_LEAGUE_GAMES = 30;
// Wie stark muss eine Tendenz von der Liga-Norm abweichen, damit wir sie
// als Signal werten? Aus Erfahrung: 0.3 Tore pro Spiel = signifikant.
const GOAL_DELTA_THRESHOLD = 0.3;
// Home-Win-Rate-Abweichung in Prozent-Punkten.
const HOME_BIAS_THRESHOLD_PCT = 8;

export function computeRefereeTendencies(refereeName: string | null | undefined, leaguePool: Fixture[]): RefereeTendencies | null {
  if (!refereeName) return null;
  const ref = refereeName.trim();
  if (ref.length < 3) return null;
  const refLower = ref.toLowerCase();

  // Pool: nur abgeschlossene Spiele MIT Schiri-Eintrag in derselben Liga.
  const pool = leaguePool.filter(
    (f) =>
      f.status === 'finished' &&
      f.homeScore !== null && f.awayScore !== null &&
      typeof f.referee === 'string' && f.referee !== null && f.referee.toLowerCase().trim() === refLower
  );
  if (pool.length < MIN_GAMES) return null;

  // Liga-Schnitt-Referenz (alle abgeschlossenen Spiele im Pool).
  const allFinished = leaguePool.filter((f) => f.status === 'finished' && f.homeScore !== null && f.awayScore !== null);
  if (allFinished.length < MIN_LEAGUE_GAMES) return null;

  const refTotalGoals = pool.reduce((s, f) => s + (f.homeScore ?? 0) + (f.awayScore ?? 0), 0);
  const refAvgGoals = refTotalGoals / pool.length;
  const refHomeWins = pool.filter((f) => (f.homeScore ?? 0) > (f.awayScore ?? 0)).length;
  const refHomeRate = refHomeWins / pool.length;

  const leagueTotalGoals = allFinished.reduce((s, f) => s + (f.homeScore ?? 0) + (f.awayScore ?? 0), 0);
  const leagueAvgGoals = leagueTotalGoals / allFinished.length;
  const leagueHomeWins = allFinished.filter((f) => (f.homeScore ?? 0) > (f.awayScore ?? 0)).length;
  const leagueHomeRate = leagueHomeWins / allFinished.length;

  const goalDelta = refAvgGoals - leagueAvgGoals;
  const homeRateDelta = (refHomeRate - leagueHomeRate) * 100;

  let summary = `${pool.length} Spiele beobachtet. `;
  if (goalDelta >= GOAL_DELTA_THRESHOLD) {
    summary += `Tor-Schnitt ${refAvgGoals.toFixed(2)} liegt ${goalDelta.toFixed(2)} ueber Liga (${leagueAvgGoals.toFixed(2)}) — tendenziell tor-reich.`;
  } else if (goalDelta <= -GOAL_DELTA_THRESHOLD) {
    summary += `Tor-Schnitt ${refAvgGoals.toFixed(2)} liegt ${Math.abs(goalDelta).toFixed(2)} unter Liga (${leagueAvgGoals.toFixed(2)}) — tendenziell tor-arm.`;
  } else {
    summary += `Tor-Schnitt ${refAvgGoals.toFixed(2)} (Liga ${leagueAvgGoals.toFixed(2)}) — tor-neutral.`;
  }
  if (Math.abs(homeRateDelta) >= HOME_BIAS_THRESHOLD_PCT) {
    summary += ` Heim-Sieg-Quote ${Math.round(refHomeRate * 100)} % ${homeRateDelta > 0 ? 'ueber' : 'unter'} Liga (${Math.round(leagueHomeRate * 100)} %).`;
  }

  return {
    name: ref,
    games: pool.length,
    avgGoalsPerGame: Math.round(refAvgGoals * 100) / 100,
    leagueAvgGoalsPerGame: Math.round(leagueAvgGoals * 100) / 100,
    homeWinRate: Math.round(refHomeRate * 1000) / 10,
    leagueHomeWinRate: Math.round(leagueHomeRate * 1000) / 10,
    summary
  };
}

const NEUTRAL_IMPACT: RefereeImpact = { lambdaMul: 1, homeBiasMul: 1, awayBiasMul: 1, factors: [] };

export function computeRefereeImpact(t: RefereeTendencies | null): RefereeImpact {
  if (!t) return NEUTRAL_IMPACT;
  let lambdaMul = 1;
  let homeBiasMul = 1;
  let awayBiasMul = 1;
  const factors: string[] = [];

  // Goal-Tendenz: bis zu +/- 5 % auf Lambda gleichgewichtet.
  const goalDelta = t.avgGoalsPerGame - t.leagueAvgGoalsPerGame;
  if (goalDelta >= GOAL_DELTA_THRESHOLD) {
    lambdaMul *= 1.05;
    factors.push(`Tor-reicher Schiri (${t.avgGoalsPerGame} vs Liga ${t.leagueAvgGoalsPerGame})`);
  } else if (goalDelta <= -GOAL_DELTA_THRESHOLD) {
    lambdaMul *= 0.95;
    factors.push(`Tor-armer Schiri (${t.avgGoalsPerGame} vs Liga ${t.leagueAvgGoalsPerGame})`);
  }

  // Heim-Bias: bis zu +/- 3 % auf homeLambda, gegenlaeufig auf awayLambda.
  const homeRateDelta = t.homeWinRate - t.leagueHomeWinRate;
  if (homeRateDelta >= HOME_BIAS_THRESHOLD_PCT) {
    homeBiasMul *= 1.03;
    awayBiasMul *= 0.97;
    factors.push(`Heim-Bias: ${t.homeWinRate.toFixed(0)} % Heim-Siege unter ihm (Liga ${t.leagueHomeWinRate.toFixed(0)} %)`);
  } else if (homeRateDelta <= -HOME_BIAS_THRESHOLD_PCT) {
    homeBiasMul *= 0.97;
    awayBiasMul *= 1.03;
    factors.push(`Auswaerts-Bias: ${t.homeWinRate.toFixed(0)} % Heim-Siege unter ihm (Liga ${t.leagueHomeWinRate.toFixed(0)} %)`);
  }

  if (factors.length === 0) {
    return NEUTRAL_IMPACT;
  }
  return { lambdaMul, homeBiasMul, awayBiasMul, factors };
}
