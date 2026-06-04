// Klare Gewinner-Prognose pro Spiel: nimmt Form-Daten + H2H und sagt
// explizit: „Voraussichtlicher Gewinner: X". Inklusive Aussagen für
// reguläre Spielzeit (90 Min) und Verlängerung (KO-Modus).
//
// Bewusst NICHT „kein Tipp möglich" zurückgeben, wenn auch nur minimale
// Daten existieren — der User will eine Antwort, keine Schwammigkeit.
// Wenn wirklich gar nichts vorliegt: ehrlicher „kein Favorit"-Verdikt.

import type { Fixture } from '@/lib/sport/fetcher';
import type { MatchPrediction } from '@/lib/sport/predictor';
import type { HeadToHeadResult } from '@/lib/sport/h2h';

export type WinnerSide = 'home' | 'away' | 'draw' | 'undecided';

export interface WinnerVerdict {
  winner: WinnerSide;
  winnerName: string;          // „Bayern München" / „Remis" / „kein Favorit"
  confidencePct: number;       // 0..100
  // 3-stufige Klarheit der Aussage:
  //   strong = ein Team klar (>= 55 % Roh-Wahrsch + Form-Bestätigung)
  //   leaning = leichter Vorteil (45–54 %)
  //   open = praktisch offen
  clarity: 'strong' | 'leaning' | 'open';
  reasoning: string[];         // 1–4 Klartext-Begründungen
  // Reguläre Spielzeit (90 Min Fußball / 4 Viertel Basketball):
  regular: {
    homePct: number;
    drawPct: number;
    awayPct: number;
  };
  // Inkl. Verlängerung: Remis aufgeteilt 50/50 auf die zwei Teams.
  // Für KO-Spiele relevant, wo es kein Remis geben kann.
  withExtraTime: {
    homePct: number;
    awayPct: number;
  };
}

interface BuildInput {
  homeTeam: string;
  awayTeam: string;
  prediction: MatchPrediction | null;
  h2h: HeadToHeadResult | null;
  finishedPool: Fixture[];     // bereits gespielte Liga-Spiele für Form-Heuristik
}

function teamForm(team: string, finished: Fixture[]): { wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; total: number } {
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const last = finished
    .filter((f) => (f.homeTeam === team || f.awayTeam === team) && f.homeScore !== null && f.awayScore !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  for (const f of last) {
    const isHome = f.homeTeam === team;
    const myGoals = isHome ? f.homeScore! : f.awayScore!;
    const opGoals = isHome ? f.awayScore! : f.homeScore!;
    goalsFor += myGoals;
    goalsAgainst += opGoals;
    if (myGoals > opGoals) wins += 1;
    else if (myGoals < opGoals) losses += 1;
    else draws += 1;
  }
  return { wins, draws, losses, goalsFor, goalsAgainst, total: last.length };
}

export function predictWinner(input: BuildInput): WinnerVerdict {
  const { homeTeam, awayTeam, prediction, h2h, finishedPool } = input;
  const reasoning: string[] = [];

  let pH = 0.33, pD = 0.33, pA = 0.34;

  // Primärquelle: Poisson-Modell, falls vorhanden.
  if (prediction) {
    pH = prediction.pHome;
    pD = prediction.pDraw;
    pA = prediction.pAway;
    reasoning.push(`Modell-Prognose: ${Math.round(pH * 100)} % Heim / ${Math.round(pD * 100)} % Remis / ${Math.round(pA * 100)} % Auswärts`);
  } else {
    // Fallback: Form-Heuristik. Auch dann eine konkrete Antwort liefern.
    const homeForm = teamForm(homeTeam, finishedPool);
    const awayForm = teamForm(awayTeam, finishedPool);
    if (homeForm.total === 0 && awayForm.total === 0) {
      // Wirklich nichts → ehrlicher „kein Favorit"-Verdikt, 50/50.
      reasoning.push('Keine Form-Daten aus der Liga vorhanden — Modell kann keinen Favoriten nennen.');
    } else {
      const homeScore = (homeForm.wins * 3 + homeForm.draws) / Math.max(1, homeForm.total);
      const awayScore = (awayForm.wins * 3 + awayForm.draws) / Math.max(1, awayForm.total);
      const total = homeScore + awayScore + 0.5;
      pH = (homeScore + 0.25) / total;
      pA = (awayScore + 0.25) / total;
      pD = Math.max(0.15, 1 - pH - pA);
      reasoning.push(`Form ${homeTeam}: ${homeForm.wins}S/${homeForm.draws}U/${homeForm.losses}N (${homeForm.total} Spiele)`);
      reasoning.push(`Form ${awayTeam}: ${awayForm.wins}S/${awayForm.draws}U/${awayForm.losses}N (${awayForm.total} Spiele)`);
    }
  }

  // H2H-Bonus: wenn Direktvergleich klar ist, leicht in Richtung historischer Sieger drücken.
  if (h2h && h2h.meetings >= 3) {
    const homeRate = h2h.winsForHome / h2h.meetings;
    const awayRate = h2h.winsForAway / h2h.meetings;
    if (homeRate >= 0.6) {
      pH = pH * 0.85 + 0.15;
      reasoning.push(`H2H: ${h2h.winsForHome}/${h2h.meetings} für ${homeTeam}`);
    } else if (awayRate >= 0.6) {
      pA = pA * 0.85 + 0.15;
      reasoning.push(`H2H: ${h2h.winsForAway}/${h2h.meetings} für ${awayTeam}`);
    }
    // Renormierung
    const sum = pH + pD + pA;
    pH /= sum; pD /= sum; pA /= sum;
  }

  // Entscheidung
  let winner: WinnerSide = 'undecided';
  let winnerName = 'kein Favorit';
  const topPct = Math.max(pH, pD, pA);
  if (topPct < 0.4) {
    winner = 'undecided';
    winnerName = 'kein klarer Favorit';
  } else if (pH >= pA && pH >= pD) {
    winner = 'home';
    winnerName = homeTeam;
  } else if (pA >= pH && pA >= pD) {
    winner = 'away';
    winnerName = awayTeam;
  } else {
    winner = 'draw';
    winnerName = 'Remis';
  }

  const homePct = Math.round(pH * 100);
  const drawPct = Math.round(pD * 100);
  const awayPct = Math.round(pA * 100);
  // Sicherstellen, dass die drei Zahlen sich zu 100 summieren.
  const correction = 100 - (homePct + drawPct + awayPct);
  const regular = {
    homePct: homePct + (winner === 'home' ? correction : 0),
    drawPct: drawPct + (winner === 'draw' ? correction : 0),
    awayPct: awayPct + (winner === 'away' ? correction : (winner === 'undecided' ? correction : 0))
  };

  // Verlängerung: Remis hälftig auf beide Seiten — gibt KO-Spiel-Tipp.
  const overtimeHome = Math.round(regular.homePct + regular.drawPct / 2);
  const overtimeAway = 100 - overtimeHome;
  const withExtraTime = { homePct: overtimeHome, awayPct: overtimeAway };

  let clarity: WinnerVerdict['clarity'];
  if (topPct >= 0.55) clarity = 'strong';
  else if (topPct >= 0.45) clarity = 'leaning';
  else clarity = 'open';

  return {
    winner,
    winnerName,
    confidencePct: Math.round(topPct * 100),
    clarity,
    reasoning,
    regular,
    withExtraTime
  };
}
