// World-Cup-Prediction-Engine — strukturierter Output fuer Hero,
// Top-8-Ranking, Match-Cards und Bracket. Pure-Lib, keine UI-Logik.
//
// Konstruktion: greift NICHT auf neue externe Daten zu. Wir
// kapseln die bestehenden Engines (wm-match-engine, wm-team-
// strength, wm-tournament-forecast, wm-schedule-2026) in das
// vom Auftrag verlangte Output-Format.
//
// Honest-Empty-States: wenn Eingabe-Daten fehlen, geben wir
// 'unknown'-Werte zurueck und reduzieren Confidence/DataQuality.
// Wir erfinden NICHT.

import { WM_2026_FIXTURES, type WmFixture, effectiveConfidence } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch, type WmMatchPrediction } from '@/lib/sport/wm-match-engine';
import { findTeamStrength, WM_2026_TEAMS, type TeamStrength } from '@/lib/sport/wm-team-strength';

export type PredictionConfidence = 'high' | 'medium' | 'low';
export type DataQuality = 'strong' | 'medium' | 'weak';
export type Trend = 'up' | 'down' | 'stable' | 'unknown';

export interface MatchPrediction {
  matchId: string;
  round: string;
  startTime: string | null;
  teamA: string;
  teamB: string;
  predictedWinner: 'teamA' | 'teamB' | 'draw' | 'unknown';
  probabilities: {
    teamA: number;
    draw?: number;
    teamB: number;
  };
  expectedScoreRange: string | null;
  confidence: PredictionConfidence;
  dataQuality: DataQuality;
  reasons: string[];
  warnings: string[];
  lastUpdated: string | null;
}

export interface TournamentWinnerPrediction {
  team: string;
  winProbability: number;
  trend: Trend;
  confidence: PredictionConfidence;
  dataQuality: DataQuality;
  reasons: string[];
  warnings: string[];
}

export interface WorldCupDashboard {
  topFavorite: TournamentWinnerPrediction | null;
  ranking: TournamentWinnerPrediction[];
  upcomingMatches: MatchPrediction[];
  lastUpdated: string;
  globalWarnings: string[];
}

// ----------------------------------------------------------------
// Hilfsfunktionen
// ----------------------------------------------------------------

function isTbdTeam(name: string): boolean {
  return /^(Sieger|Verlierer|Zweiter|Erster|Gruppenerster|Gruppenzweiter|Bester|Gewinner|Drittplatzierter)\s/i.test(name.trim())
    || name.includes('TBD');
}

function confidenceFromPct(topPct: number): PredictionConfidence {
  if (topPct >= 60) return 'high';
  if (topPct >= 45) return 'medium';
  return 'low';
}

function dataQualityForTeams(a: TeamStrength | null, b: TeamStrength | null): DataQuality {
  if (a && b) return 'strong';
  if (a || b) return 'medium';
  return 'weak';
}

function expectedScoreRange(p: WmMatchPrediction): string | null {
  if (!p.topScorelines || p.topScorelines.length === 0) return null;
  // Top-2 wahrscheinlichste Ergebnisse als Bereich, sortiert nach
  // erwarteter Differenz (Favoriten-Seite vorne).
  const top = p.topScorelines.slice(0, 2).map((s) => s.score);
  if (top.length === 1) return top[0];
  // Reihenfolge intuitiv: wahrscheinlichstes Ergebnis -> zweitwahrscheinlichstes
  return `${top[0]} bis ${top[1]}`;
}

function buildReasonsForMatch(
  pred: WmMatchPrediction,
  a: TeamStrength | null,
  b: TeamStrength | null,
  fix: WmFixture
): string[] {
  const reasons: string[] = [];
  if (a && b) {
    const eloDiff = a.elo - b.elo;
    if (Math.abs(eloDiff) >= 60) {
      const better = eloDiff > 0 ? a.name : b.name;
      reasons.push(`${better} mit deutlich höherer ELO-Bewertung (Differenz ${Math.abs(eloDiff)} Punkte).`);
    } else {
      reasons.push('Beide Teams in ELO-Reichweite, Spiel auf Augenhöhe.');
    }
    if (Math.abs(a.formIndex - b.formIndex) >= 3) {
      const hot = a.formIndex > b.formIndex ? a.name : b.name;
      reasons.push(`${hot} kommt mit besserer aktueller Formkurve ins Spiel.`);
    }
    const offDiff = a.offensive - b.offensive;
    if (Math.abs(offDiff) >= 5) {
      const better = offDiff > 0 ? a.name : b.name;
      reasons.push(`${better} mit klar stärkerer Offensivbewertung.`);
    }
  }
  if (fix.phase !== 'Gruppe') {
    reasons.push(`KO-Spiel (${fix.phase}) — Engine bezieht reguläre Spielzeit ein, Verlängerung wird separat modelliert.`);
  }
  return reasons.slice(0, 3);
}

function buildWarningsForMatch(
  a: TeamStrength | null,
  b: TeamStrength | null,
  fix: WmFixture
): string[] {
  const warnings: string[] = [];
  if (!a && !b) {
    warnings.push('Für beide Teams fehlen Modell-Daten — Prognose nicht belastbar.');
  } else if (!a) {
    warnings.push(`Modell-Daten zu ${fix.homeTeam} fehlen — Prognose mit Vorbehalt.`);
  } else if (!b) {
    warnings.push(`Modell-Daten zu ${fix.awayTeam} fehlen — Prognose mit Vorbehalt.`);
  }
  const conf = effectiveConfidence(fix);
  if (conf === 'placeholder' || conf === 'auslosung') {
    warnings.push('Anstoss/Stadion nicht 100 % verifiziert — kann sich kurzfristig ändern.');
  }
  if (conf === 'tbd') {
    warnings.push('Mannschaftspaarung steht noch nicht fest.');
  }
  return warnings;
}

// ----------------------------------------------------------------
// Match-Prognose
// ----------------------------------------------------------------

export function predictMatch(fix: WmFixture, nowIso: string): MatchPrediction {
  const startTime = fix.time ? `${fix.date}T${fix.time}:00Z` : null;

  if (isTbdTeam(fix.homeTeam) || isTbdTeam(fix.awayTeam)) {
    return {
      matchId: fix.id,
      round: fix.phase,
      startTime,
      teamA: fix.homeTeam,
      teamB: fix.awayTeam,
      predictedWinner: 'unknown',
      probabilities: { teamA: 0, draw: 0, teamB: 0 },
      expectedScoreRange: null,
      confidence: 'low',
      dataQuality: 'weak',
      reasons: [],
      warnings: ['Mannschaftspaarung steht noch nicht fest — keine Prognose möglich.'],
      lastUpdated: nowIso
    };
  }

  const a = findTeamStrength(fix.homeTeam);
  const b = findTeamStrength(fix.awayTeam);

  if (!a && !b) {
    return {
      matchId: fix.id,
      round: fix.phase,
      startTime,
      teamA: fix.homeTeam,
      teamB: fix.awayTeam,
      predictedWinner: 'unknown',
      probabilities: { teamA: 0, draw: 0, teamB: 0 },
      expectedScoreRange: null,
      confidence: 'low',
      dataQuality: 'weak',
      reasons: [],
      warnings: ['Für beide Teams fehlen Modell-Daten — keine belastbare Prognose möglich.'],
      lastUpdated: nowIso
    };
  }

  const pred = predictWmMatch({
    homeTeam: fix.homeTeam,
    awayTeam: fix.awayTeam,
    venue: fix.venue,
    phase: fix.phase
  });

  const dataQuality = dataQualityForTeams(a, b);
  const topPct = pred.pick.confidencePct;
  const baseConfidence = confidenceFromPct(topPct);
  // Reduce confidence one stufe wenn Datenqualitaet schwach.
  const confidence: PredictionConfidence = dataQuality === 'weak'
    ? 'low'
    : dataQuality === 'medium' && baseConfidence === 'high' ? 'medium' : baseConfidence;

  let predictedWinner: MatchPrediction['predictedWinner'] = 'unknown';
  if (pred.pick.winner === 'home') predictedWinner = 'teamA';
  else if (pred.pick.winner === 'away') predictedWinner = 'teamB';
  else if (pred.pick.winner === 'draw') predictedWinner = 'draw';

  return {
    matchId: fix.id,
    round: fix.phase,
    startTime,
    teamA: fix.homeTeam,
    teamB: fix.awayTeam,
    predictedWinner,
    probabilities: {
      teamA: pred.regular.homePct,
      draw: pred.regular.drawPct,
      teamB: pred.regular.awayPct
    },
    expectedScoreRange: expectedScoreRange(pred),
    confidence,
    dataQuality,
    reasons: buildReasonsForMatch(pred, a, b, fix),
    warnings: buildWarningsForMatch(a, b, fix),
    lastUpdated: nowIso
  };
}

// ----------------------------------------------------------------
// Turnier-Sieger-Ranking
// ----------------------------------------------------------------

function buildReasonsForChampion(
  team: TeamStrength,
  rankIndex: number
): string[] {
  const reasons: string[] = [];
  if (team.elo >= 1950) reasons.push(`Sehr starke ELO-Bewertung (${team.elo}).`);
  else if (team.elo >= 1850) reasons.push(`Solide ELO-Bewertung (${team.elo}).`);
  if (team.offensive >= 75) reasons.push(`Hohe Offensiv-Stärke (${team.offensive}).`);
  if (team.defensive >= 73) reasons.push(`Stabile Defensiv-Bewertung (${team.defensive}).`);
  if (team.formIndex >= 3) reasons.push(`Aktuelle Formkurve klar nach oben (${team.formIndex >= 0 ? '+' : ''}${team.formIndex}).`);
  if (team.isHost) reasons.push('Co-Gastgeber — Heimvorteil auf dem Turnier.');
  if (rankIndex === 0 && reasons.length === 0) reasons.push('Höchste Modell-Wahrscheinlichkeit für den Turniersieg.');
  return reasons.slice(0, 3);
}

function buildWarningsForChampion(team: TeamStrength | null): string[] {
  const warnings: string[] = [];
  if (!team) {
    warnings.push('Modell-Daten zum Team fehlen — Einschätzung nicht belastbar.');
  }
  return warnings;
}

// Sammelt die Teams, die im aktuellen Spielplan (Gruppen) auftauchen.
// Damit beziehen wir die Sieger-Liste auf die wirklich qualifizierten
// Mannschaften, nicht auf die gesamte Strength-Tabelle.
function qualifiedTeamsFromSchedule(): TeamStrength[] {
  const names = new Set<string>();
  for (const f of WM_2026_FIXTURES) {
    if (f.phase !== 'Gruppe') continue;
    if (!isTbdTeam(f.homeTeam)) names.add(f.homeTeam);
    if (!isTbdTeam(f.awayTeam)) names.add(f.awayTeam);
  }
  const teams: TeamStrength[] = [];
  for (const n of names) {
    const t = findTeamStrength(n);
    if (t) teams.push(t);
  }
  return teams;
}

// Berechnet einen Champion-Score pro Team: ELO ist der Haupt-Treiber,
// Form/Offensive/Defensive/Heimvorteil gewichten weiter. Die Score-
// Verteilung wird dann ueber Softmax auf Wahrscheinlichkeiten normiert.
// Bewusst flache Temperatur — WM-Sieger-Verteilung ist breit, kein
// Team sollte > ~22 % ankommen.
function championScore(t: TeamStrength): number {
  const base = (t.elo - 1500) / 50;        // 0..10 grob
  const form = t.formIndex * 0.6;          // -3..+5
  const off = (t.offensive - 65) / 8;      // ca -3..+4
  const def = (t.defensive - 62) / 8;
  const host = t.isHost ? 0.6 : 0;
  return base + form + off + def + host;
}

function softmaxToPct(scores: number[], temperature = 1.6): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  if (sum <= 0) return scores.map(() => 0);
  return exps.map((e) => (e / sum) * 100);
}

export function rankWorldCupWinners(nowIso: string, limit = 8): TournamentWinnerPrediction[] {
  void nowIso;
  const qualified = qualifiedTeamsFromSchedule();
  if (qualified.length === 0) return [];
  const scored = qualified
    .map((t) => ({ t, score: championScore(t) }))
    .sort((a, b) => b.score - a.score);
  const pcts = softmaxToPct(scored.map((s) => s.score));
  return scored.slice(0, limit).map((s, idx) => {
    const team = s.t;
    const probability = Math.round(pcts[idx] * 10) / 10; // eine Nachkommastelle
    const dataQuality: DataQuality = team.elo >= 1800 ? 'strong' : 'medium';
    const baseConfidence = confidenceFromPct(probability);
    // Sieger-Tipp insgesamt: bei ~20 % selbst fuer den Favoriten ist
    // 'high' nicht ehrlich — Turnier ist breit. Wir cappen auf 'medium'.
    const confidence: PredictionConfidence = baseConfidence === 'high' ? 'medium' : baseConfidence;
    return {
      team: team.name,
      winProbability: probability,
      trend: 'unknown' as Trend,
      confidence,
      dataQuality,
      reasons: buildReasonsForChampion(team, idx),
      warnings: buildWarningsForChampion(team)
    };
  });
}

// ----------------------------------------------------------------
// Hero-Dashboard
// ----------------------------------------------------------------

export function buildWorldCupDashboard(input?: {
  nowIso?: string;
  upcomingLimit?: number;
}): WorldCupDashboard {
  const nowIso = input?.nowIso ?? new Date().toISOString();
  const upcomingLimit = input?.upcomingLimit ?? 6;
  const globalWarnings: string[] = [];

  if (WM_2026_TEAMS.length < 20) {
    globalWarnings.push('Modell-Team-Datenbasis unvollständig — Prognosen können verschoben sein.');
  }
  if (WM_2026_FIXTURES.length === 0) {
    globalWarnings.push('Kein Spielplan geladen — keine Vorhersagen möglich.');
  }

  const ranking = rankWorldCupWinners(nowIso, 8);
  const topFavorite = ranking.length > 0 ? ranking[0] : null;

  // Heutiges Datum (UTC-Tag — fuer Filter "ab heute"); UI rechnet bei
  // Bedarf auf Berlin um.
  const todayIso = nowIso.slice(0, 10);
  const upcomingFixtures = WM_2026_FIXTURES
    .filter((f) => f.date >= todayIso)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
    })
    .slice(0, upcomingLimit);

  const upcomingMatches = upcomingFixtures.map((f) => predictMatch(f, nowIso));

  return {
    topFavorite,
    ranking,
    upcomingMatches,
    lastUpdated: nowIso,
    globalWarnings
  };
}
