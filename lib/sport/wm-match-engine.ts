// Profi-Match-Engine für die WM 2026.
//
// Modell-Schichten:
//   1. ELO-Differenz → 1X2-Basis-Wahrscheinlichkeiten (mit Draw-Anteil
//      abhängig von |eloDiff|).
//   2. Form-Index ergänzt die ELO um Trend-Bonus (±0.5 Tore × Form).
//   3. xG-Komponente: erwartete Tore beider Seiten aus Offense vs.
//      Defense-Rating, plus Spielort-Faktoren (Hitze, Höhe, Heim-Land).
//   4. Poisson-Verteilung auf erwartete Tore → Top-Scorelines,
//      Over/Under 2.5, BTTS.
//   5. Verlängerungs-Wahrscheinlichkeit für KO-Spiele.
//
// Output ist eine vollständige Profi-Prognose pro Match.

import { findTeamStrength, FALLBACK_TEAM, type TeamStrength } from '@/lib/sport/wm-team-strength';

export interface WmMatchPrediction {
  homeTeam: string;
  awayTeam: string;
  // ELO-Stand zum Zeitpunkt der Prognose.
  homeElo: number;
  awayElo: number;
  eloDiff: number;
  // 1X2 reguläre Spielzeit.
  regular: { homePct: number; drawPct: number; awayPct: number };
  // Inkl. Verlängerung (Remis 50/50 + xG-basierter OT-Bonus).
  withExtraTime: { homePct: number; awayPct: number };
  // Erwartete Tore.
  expectedGoals: { home: number; away: number; total: number };
  // Tor-Märkte (in Prozent).
  goalMarkets: {
    over15: number;
    over25: number;
    over35: number;
    btts: number;
    cleanSheetHome: number;
    cleanSheetAway: number;
  };
  // Top-3 wahrscheinlichste Endergebnisse.
  topScorelines: Array<{ score: string; probability: number }>;
  // Klarste 1X2-Aussage.
  pick: {
    winner: 'home' | 'away' | 'draw' | 'undecided';
    winnerName: string;
    confidencePct: number;
    clarity: 'strong' | 'leaning' | 'open';
  };
  // Begründungen.
  reasoning: string[];
  // Spielort-Faktoren, die aktiv wurden.
  venueFactors: string[];
  // Sicherheitsgrad der Datenbasis 0–100.
  dataConfidence: number;
}

interface BuildInput {
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  phase?: 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale';
  // „Heim" hier = formal die Heim-Mannschaft im Spielplan. In Gruppen-WM-
  // Spielen ist das selten ein echter Heim-Vorteil, außer für Gastgeber.
}

// Klassische ELO-Sieg-Wahrscheinlichkeit.
function eloWinProb(eloDiffWithHomeBonus: number): number {
  return 1 / (1 + Math.pow(10, -eloDiffWithHomeBonus / 400));
}

// Draw-Anteil: bei eloDiff=0 → 0.28, bei 400 → 0.12, asymptotisch.
function drawShare(eloDiffAbs: number): number {
  return Math.max(0.10, 0.28 - eloDiffAbs * 0.0004);
}

// Spielort-Heuristik: erkennt Hitze-Hotspots, Höhenlage, Host-Bonus.
function venueBonus(venue: string | undefined, home: TeamStrength, away: TeamStrength): { homeBoost: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let boost = 0;
  if (!venue) return { homeBoost: boost, reasoning };
  const v = venue.toLowerCase();

  // Höhenlage Mexico City (~2.250 m): Heimteam besser akklimatisiert.
  if (v.includes('mexico city') || v.includes('azteca')) {
    if (home.name === 'Mexiko') {
      boost += 60;
      reasoning.push('Estadio Azteca · 2.250 m Höhe — Mexiko klar im Vorteil bei Akklimatisierung.');
    } else if (away.name === 'Mexiko') {
      boost -= 60;
      reasoning.push('Estadio Azteca · 2.250 m Höhe — Mexiko ist auswärts-Heimteam.');
    } else {
      reasoning.push('Estadio Azteca · 2.250 m Höhe — beide Teams unter Akklimatisierungs-Druck.');
    }
  }

  // Hitze-Hotspots (Miami, Houston, Dallas, Atlanta im Juni/Juli):
  // begünstigt defensive, ausdauernde Mannschaften.
  if (v.includes('miami') || v.includes('houston') || v.includes('dallas') || v.includes('atlanta')) {
    const defensiveAdvantage = (home.defensive - away.defensive) * 0.4;
    boost += defensiveAdvantage;
    reasoning.push('Hitze-Hotspot im US-Süden — defensiv stärkeres Team profitiert.');
  }

  // Host-Bonus: USA / Kanada / Mexiko bekommen für Spiele auf eigenem Boden
  // einen leichten Heimvorteil (~30 ELO-Punkte).
  if (home.isHost && (
    (home.name === 'USA' && !v.includes('toronto') && !v.includes('vancouver') && !v.includes('mexico') && !v.includes('guadalajara') && !v.includes('monterrey')) ||
    (home.name === 'Kanada' && (v.includes('toronto') || v.includes('vancouver'))) ||
    (home.name === 'Mexiko' && (v.includes('mexico') || v.includes('guadalajara') || v.includes('monterrey')))
  )) {
    boost += 30;
    reasoning.push(`${home.name} spielt auf eigenem Boden — Host-Bonus +30 ELO.`);
  }

  return { homeBoost: boost, reasoning };
}

// Poisson-Wahrscheinlichkeit für k Tore bei Erwartung λ.
function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial;
}

function clarityFor(topPct: number): WmMatchPrediction['pick']['clarity'] {
  if (topPct >= 0.55) return 'strong';
  if (topPct >= 0.42) return 'leaning';
  return 'open';
}

export function predictWmMatch(input: BuildInput): WmMatchPrediction {
  const reasoning: string[] = [];
  const homeStrengthRaw = findTeamStrength(input.homeTeam);
  const awayStrengthRaw = findTeamStrength(input.awayTeam);
  const home = homeStrengthRaw ?? FALLBACK_TEAM;
  const away = awayStrengthRaw ?? FALLBACK_TEAM;

  let dataConfidence = 100;
  if (!homeStrengthRaw) dataConfidence -= 35;
  if (!awayStrengthRaw) dataConfidence -= 35;

  // 1) ELO + Form: berechne effektive ELO-Differenz.
  const formBoost = (home.formIndex - away.formIndex) * 8; // ±8 ELO pro Form-Punkt
  const baseDiff = home.elo - away.elo + formBoost;

  // 2) Spielort-Faktoren on top.
  const { homeBoost: venueBoost, reasoning: venueReasoning } = venueBonus(input.venue, home, away);
  const effectiveDiff = baseDiff + venueBoost;

  // 3) 1X2 aus ELO.
  const baseHome = eloWinProb(effectiveDiff);
  const draw = drawShare(Math.abs(effectiveDiff));
  const remaining = 1 - draw;
  const pH = baseHome * remaining;
  const pA = (1 - baseHome) * remaining;

  // 4) xG-Modell für Tore.
  // Erwartete Tore = Offense_eigene * (100 - Defense_gegner) / 50 * Spiel-Ergonomie
  const baseTotalGoals = 2.55; // historischer WM-Schnitt
  const homeGoalShare = (home.offensive * (110 - away.defensive)) / 10000;
  const awayGoalShare = (away.offensive * (110 - home.defensive)) / 10000;
  const goalRatio = homeGoalShare / (homeGoalShare + awayGoalShare);
  const xgHome = baseTotalGoals * goalRatio * (1 + (effectiveDiff > 0 ? 0.08 : -0.05));
  const xgAway = baseTotalGoals * (1 - goalRatio) * (1 + (effectiveDiff < 0 ? 0.08 : -0.05));
  const xgTotal = xgHome + xgAway;

  // 5) Tor-Märkte aus Poisson.
  const maxGoals = 8;
  let over15 = 0, over25 = 0, over35 = 0, btts = 0, cleanSheetHome = 0, cleanSheetAway = 0;
  const scoreProbs = new Map<string, number>();
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonPmf(h, xgHome) * poissonPmf(a, xgAway);
      const total = h + a;
      if (total >= 2) over15 += p;
      if (total >= 3) over25 += p;
      if (total >= 4) over35 += p;
      if (h > 0 && a > 0) btts += p;
      if (a === 0) cleanSheetHome += p;
      if (h === 0) cleanSheetAway += p;
      scoreProbs.set(`${h}:${a}`, p);
    }
  }

  // 6) Top-Scorelines.
  const topScorelines = [...scoreProbs.entries()]
    .map(([score, probability]) => ({ score, probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  // 7) Pick-Entscheidung.
  const topPct = Math.max(pH, draw, pA);
  let winner: WmMatchPrediction['pick']['winner'];
  let winnerName: string;
  if (topPct < 0.36 && draw < 0.45) {
    winner = 'undecided';
    winnerName = 'kein klarer Favorit';
  } else if (pH > pA && pH >= draw) {
    winner = 'home';
    winnerName = home.name === 'Unbekanntes Team' ? input.homeTeam : home.name;
  } else if (pA > pH && pA >= draw) {
    winner = 'away';
    winnerName = away.name === 'Unbekanntes Team' ? input.awayTeam : away.name;
  } else {
    winner = 'draw';
    winnerName = 'Remis wahrscheinlich';
  }

  // 8) Verlängerung: Remis hälftig + leichter Bonus für stärkeres Team.
  const overtimeSplit = 0.5 + Math.tanh(effectiveDiff / 500) * 0.12;
  const overtimeHomeFromDraw = draw * overtimeSplit;
  const overtimeAwayFromDraw = draw * (1 - overtimeSplit);
  const otHome = pH + overtimeHomeFromDraw;
  const otAway = pA + overtimeAwayFromDraw;
  const otSum = otHome + otAway;

  // Reasoning aufbauen.
  if (homeStrengthRaw) {
    reasoning.push(`${home.name}: ELO ${home.elo}, Off ${home.offensive}, Def ${home.defensive}, Form ${home.formIndex >= 0 ? '+' : ''}${home.formIndex}`);
  } else {
    reasoning.push(`${input.homeTeam}: keine Profi-Daten in WM-Datenbasis — Fallback-Werte angesetzt.`);
  }
  if (awayStrengthRaw) {
    reasoning.push(`${away.name}: ELO ${away.elo}, Off ${away.offensive}, Def ${away.defensive}, Form ${away.formIndex >= 0 ? '+' : ''}${away.formIndex}`);
  } else {
    reasoning.push(`${input.awayTeam}: keine Profi-Daten in WM-Datenbasis — Fallback-Werte angesetzt.`);
  }
  reasoning.push(`Effektive ELO-Differenz: ${effectiveDiff >= 0 ? '+' : ''}${Math.round(effectiveDiff)} (Form-Bonus ${formBoost >= 0 ? '+' : ''}${formBoost}, Spielort ${venueBoost >= 0 ? '+' : ''}${Math.round(venueBoost)})`);
  reasoning.push(`xG-Modell: ${xgHome.toFixed(2)} Tore Heim vs. ${xgAway.toFixed(2)} Tore Auswärts (Σ ${xgTotal.toFixed(2)})`);
  if (input.phase && input.phase !== 'Gruppe') {
    reasoning.push(`KO-Spiel (${input.phase}) — Wahrscheinlichkeiten beziehen sich auf reguläre Spielzeit, Verlängerungs-Box separat.`);
  }

  // Helfer: in Prozent runden und Summe absichern.
  const round100 = (a: number, b: number, c: number) => {
    const x = Math.round(a * 100);
    const y = Math.round(b * 100);
    const z = Math.round(c * 100);
    const corr = 100 - (x + y + z);
    const max = Math.max(x, y, z);
    if (x === max) return { a: x + corr, b: y, c: z };
    if (y === max) return { a: x, b: y + corr, c: z };
    return { a: x, b: y, c: z + corr };
  };
  const r = round100(pH, draw, pA);

  return {
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    homeElo: home.elo,
    awayElo: away.elo,
    eloDiff: Math.round(effectiveDiff),
    regular: { homePct: r.a, drawPct: r.b, awayPct: r.c },
    withExtraTime: {
      homePct: Math.round((otHome / otSum) * 100),
      awayPct: 100 - Math.round((otHome / otSum) * 100)
    },
    expectedGoals: {
      home: Math.round(xgHome * 100) / 100,
      away: Math.round(xgAway * 100) / 100,
      total: Math.round(xgTotal * 100) / 100
    },
    goalMarkets: {
      over15: Math.round(over15 * 100),
      over25: Math.round(over25 * 100),
      over35: Math.round(over35 * 100),
      btts: Math.round(btts * 100),
      cleanSheetHome: Math.round(cleanSheetHome * 100),
      cleanSheetAway: Math.round(cleanSheetAway * 100)
    },
    topScorelines: topScorelines.map((s) => ({
      score: s.score,
      probability: Math.round(s.probability * 1000) / 10
    })),
    pick: {
      winner,
      winnerName,
      confidencePct: Math.round(topPct * 100),
      clarity: clarityFor(topPct)
    },
    reasoning,
    venueFactors: venueReasoning,
    dataConfidence: Math.max(0, dataConfidence)
  };
}
