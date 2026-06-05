// Klare Gewinner-Prognose pro Spiel. Verbesserte Engine (Welle 7751+):
//
// Zentrale Verbesserungen ggü. v1:
//   1. Sport-Modus: 'football' (default) hat ~28 % Remis-Anteil,
//      'basketball' / 'hockey' nur ~3 % (OT → Sieger steht fest).
//   2. Heimvorteil als Default-Anker statt 33/33/34 — selbst ohne
//      Datenpool zeigt die App Heim als leichten Favoriten, weil das
//      statistisch real ist (Top-Ligen ~46–50 % Heim, NBA ~55 % Heim).
//   3. Form aus dem Pool zählt jetzt auch bei 1–2 Spielen pro Team.
//   4. Team-Name-Fuzzy-Match (Bilbao Basket ≈ Bilbao Basketball Club).
//   5. „Kein klarer Favorit" erst, wenn wirklich KEIN Vorteil messbar
//      ist und der Heimvorteil-Default auch nur knapp führt (< 40 %).

import type { Fixture } from '@/lib/sport/fetcher';
import type { MatchPrediction } from '@/lib/sport/predictor';
import type { HeadToHeadResult } from '@/lib/sport/h2h';

export type WinnerSide = 'home' | 'away' | 'draw' | 'undecided';
export type Sport = 'football' | 'basketball' | 'hockey';

export interface WinnerVerdict {
  winner: WinnerSide;
  winnerName: string;
  confidencePct: number;
  clarity: 'strong' | 'leaning' | 'open';
  reasoning: string[];
  regular: { homePct: number; drawPct: number; awayPct: number };
  withExtraTime: { homePct: number; awayPct: number };
  source: 'model' | 'form' | 'heuristic';   // woher die Aussage kommt
}

interface BuildInput {
  homeTeam: string;
  awayTeam: string;
  prediction: MatchPrediction | null;
  h2h: HeadToHeadResult | null;
  finishedPool: Fixture[];
  sport?: Sport;
}

// Sport-spezifische Defaults: durchschnittliche Heim/Remis/Auswärts-
// Verteilung in der jeweiligen Sportart über lange Zeiträume.
const SPORT_DEFAULTS: Record<Sport, { home: number; draw: number; away: number }> = {
  football: { home: 0.46, draw: 0.26, away: 0.28 },
  basketball: { home: 0.58, draw: 0.03, away: 0.39 },
  hockey: { home: 0.52, draw: 0.04, away: 0.44 }
};

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|bc|kk|zkk|cska|bbk|basket|basketball|club|hockey|hc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

interface FormSnapshot {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  total: number;
  pointsPerGame: number;
}

function teamForm(team: string, finished: Fixture[]): FormSnapshot {
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const last = finished
    .filter((f) => (teamsMatch(f.homeTeam, team) || teamsMatch(f.awayTeam, team)) && f.homeScore !== null && f.awayScore !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  for (const f of last) {
    const isHome = teamsMatch(f.homeTeam, team);
    const myGoals = isHome ? f.homeScore! : f.awayScore!;
    const opGoals = isHome ? f.awayScore! : f.homeScore!;
    goalsFor += myGoals;
    goalsAgainst += opGoals;
    if (myGoals > opGoals) wins += 1;
    else if (myGoals < opGoals) losses += 1;
    else draws += 1;
  }
  const total = last.length;
  const pointsPerGame = total > 0 ? (wins * 3 + draws) / total : 0;
  return { wins, draws, losses, goalsFor, goalsAgainst, total, pointsPerGame };
}

function clarityFor(topPct: number): WinnerVerdict['clarity'] {
  if (topPct >= 0.58) return 'strong';
  if (topPct >= 0.46) return 'leaning';
  return 'open';
}

function roundToHundred(home: number, draw: number, away: number): { home: number; draw: number; away: number } {
  const h = Math.round(home * 100);
  const d = Math.round(draw * 100);
  const a = Math.round(away * 100);
  // Korrektur auf den Spitzenreiter, damit Summe = 100
  const correction = 100 - (h + d + a);
  const max = Math.max(h, d, a);
  if (h === max) return { home: h + correction, draw: d, away: a };
  if (d === max) return { home: h, draw: d + correction, away: a };
  return { home: h, draw: d, away: a + correction };
}

export function predictWinner(input: BuildInput): WinnerVerdict {
  const { homeTeam, awayTeam, prediction, h2h, finishedPool } = input;
  const sport: Sport = input.sport ?? 'football';
  const reasoning: string[] = [];
  let source: WinnerVerdict['source'];

  let pH: number;
  let pD: number;
  let pA: number;

  // 1) Poisson-Modell hat Vorrang.
  if (prediction) {
    pH = prediction.pHome;
    pD = prediction.pDraw;
    pA = prediction.pAway;
    source = 'model';
    reasoning.push(`Poisson-Modell aus echten Liga-Daten: ${Math.round(pH * 100)} % Heim / ${Math.round(pD * 100)} % Remis / ${Math.round(pA * 100)} % Auswärts`);
  } else {
    // 2) Form-Heuristik aus dem Pool — funktioniert auch mit 1 Spiel.
    const homeForm = teamForm(homeTeam, finishedPool);
    const awayForm = teamForm(awayTeam, finishedPool);
    const def = SPORT_DEFAULTS[sport];

    if (homeForm.total === 0 && awayForm.total === 0) {
      // 3) Heuristik-Fallback: nicht 33/33/34, sondern Sport-Default
      //    mit Heimvorteil. Plus zusätzlichen +3 %-Heim-Bonus, da wir
      //    nichts gegen den Heimvorteil wissen.
      pH = def.home + 0.03;
      pD = def.draw;
      pA = def.away - 0.03;
      // Renormieren
      const sum = pH + pD + pA;
      pH /= sum; pD /= sum; pA /= sum;
      source = 'heuristic';
      reasoning.push(`Keine Form-Daten — Heimvorteil-Schätzung für ${sport === 'basketball' ? 'Basketball' : sport === 'hockey' ? 'Eishockey' : 'Fußball'} angesetzt.`);
      reasoning.push(`Statistik-Anker: ${Math.round(def.home * 100)} % Heim / ${Math.round(def.draw * 100)} % Remis / ${Math.round(def.away * 100)} % Auswärts in dieser Sportart.`);
    } else {
      // Form-basiert: PPG-Differenz auf Sport-Default modulieren.
      const homePpg = homeForm.total > 0 ? homeForm.pointsPerGame : def.home * 3;
      const awayPpg = awayForm.total > 0 ? awayForm.pointsPerGame : def.away * 3;
      const ppgDiff = homePpg - awayPpg; // -3 bis +3 möglich
      // Modulation: 0.07 pro PPG-Differenz auf Heim drücken
      const homeBoost = Math.max(-0.18, Math.min(0.18, ppgDiff * 0.07));
      pH = def.home + homeBoost;
      pA = def.away - homeBoost;
      pD = Math.max(sport === 'football' ? 0.18 : 0.02, def.draw);
      const sum = pH + pD + pA;
      pH /= sum; pD /= sum; pA /= sum;
      source = 'form';
      if (homeForm.total > 0) {
        reasoning.push(`Form ${homeTeam} (${homeForm.total} Spiele): ${homeForm.wins}S/${homeForm.draws}U/${homeForm.losses}N · ${homePpg.toFixed(1)} PPG`);
      } else {
        reasoning.push(`${homeTeam}: keine eigenen Spiele im Pool — Liga-Schnitt angesetzt.`);
      }
      if (awayForm.total > 0) {
        reasoning.push(`Form ${awayTeam} (${awayForm.total} Spiele): ${awayForm.wins}S/${awayForm.draws}U/${awayForm.losses}N · ${awayPpg.toFixed(1)} PPG`);
      } else {
        reasoning.push(`${awayTeam}: keine eigenen Spiele im Pool — Liga-Schnitt angesetzt.`);
      }
    }
  }

  // 4) H2H-Bonus, wenn klare Bilanz: drückt 15 % auf den historischen Sieger.
  if (h2h && h2h.meetings >= 3) {
    const homeRate = h2h.winsForHome / h2h.meetings;
    const awayRate = h2h.winsForAway / h2h.meetings;
    if (homeRate >= 0.6) {
      pH = pH * 0.85 + 0.15;
      reasoning.push(`H2H-Bilanz: ${h2h.winsForHome}/${h2h.meetings} für ${homeTeam}`);
    } else if (awayRate >= 0.6) {
      pA = pA * 0.85 + 0.15;
      reasoning.push(`H2H-Bilanz: ${h2h.winsForAway}/${h2h.meetings} für ${awayTeam}`);
    }
    const sum = pH + pD + pA;
    pH /= sum; pD /= sum; pA /= sum;
  }

  // 5) Entscheidung
  const topPct = Math.max(pH, pD, pA);
  let winner: WinnerSide;
  let winnerName: string;
  if (topPct < 0.40 && pD < 0.5) {
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
    winnerName = 'Remis wahrscheinlich';
  }

  const rounded = roundToHundred(pH, pD, pA);
  const regular = { homePct: rounded.home, drawPct: rounded.draw, awayPct: rounded.away };
  // Verlängerung: Remis auf beide Seiten hälftig.
  const overtimeHome = Math.round(regular.homePct + regular.drawPct / 2);
  const overtimeAway = 100 - overtimeHome;
  const withExtraTime = { homePct: overtimeHome, awayPct: overtimeAway };

  return {
    winner,
    winnerName,
    confidencePct: Math.round(topPct * 100),
    clarity: clarityFor(topPct),
    reasoning,
    regular,
    withExtraTime,
    source
  };
}
