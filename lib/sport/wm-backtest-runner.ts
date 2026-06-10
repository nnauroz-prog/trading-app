// WM Backtest-Runner — pruefen ob unser System ueberhaupt funktioniert.
//
// Pipeline pro historischem Spiel:
//   1) predictWmMatch (ELO + Form-Index + xG + Spielort)
//   2) evaluateWmConditions (Akklimatisierung, Hoehe, Jetlag, Heimvorteil,
//      Publikum, Mittagshitze) — fuer Spiele OHNE bekanntes WM-Stadion
//      wirken nur die teamunabhaengigen Faktoren nicht.
//   3) evaluateProTipperAgent (alle 10 Sub-Checks inkl. Conditions-Veto)
//   4) Wenn alle Filter passieren: Tier zuordnen (hoechste-konfluenz oder
//      modell-favorit).
//   5) Sieger-Pick gegen tatsaechliches Ergebnis abgleichen.
//
// Output: Hit-Rate pro Tier, gesamt, plus konkrete Brier-Scores.
// Ehrlicher Look-Ahead-Disclaimer: ELO-Werte sind aktueller Snapshot.

import { unstable_cache } from 'next/cache';
import { predictWmMatch } from '@/lib/sport/wm-match-engine';
import { evaluateWmConditions, eloDiffShift } from '@/lib/sport/wm-conditions';
import { evaluateProTipperAgent } from '@/lib/sport/sport-pro-tipper-agent';
import { WM_BACKTEST_DATASET, type BacktestHistoricalMatch } from '@/lib/sport/wm-backtest-dataset';

export type BacktestPickTier = 'hoechste-konfluenz' | 'modell-favorit' | 'kein-pick';
export type BacktestOutcome = 'treffer' | 'daneben' | 'remis' | 'kein-pick';

export interface BacktestMatchResult {
  match: BacktestHistoricalMatch;
  // Was unser System eingestuft haette.
  tier: BacktestPickTier;
  winnerSide: 'home' | 'away' | null;
  winnerTeam: string | null;
  confidencePct: number | null;
  eloDiff: number | null;
  conditionsActiveFactorIds: string[];
  // Warum kein Pick (falls tier='kein-pick').
  blockReason: string | null;
  // Echtes Ergebnis.
  actualOutcome: 'home' | 'away' | 'draw';
  // Pick richtig/falsch.
  outcome: BacktestOutcome;
  brierScore: number | null; // (pick_prob - actual)^2 mit actual ∈ {0,1}, nur fuer Picks
}

export interface BacktestReport {
  generatedAt: string;
  totalMatches: number;
  // Picks pro Tier.
  picksHoechsteKonfluenz: number;
  picksModellFavorit: number;
  noPick: number;
  // Hit-Rate pro Tier (nur "treffer" / ("treffer" + "daneben"), Remis = push).
  hitRateHoechsteKonfluenzPct: number | null;
  hitRateModellFavoritPct: number | null;
  hitRateCombinedPct: number | null;
  // Brier-Score (Mittelwert) pro Tier.
  brierHoechsteKonfluenz: number | null;
  brierModellFavorit: number | null;
  // Aufschluesselung pro Faktor: wenn Pick + Faktor aktiv, wie war Hit-Rate?
  factorImpact: Array<{ factorId: string; picksWithFactor: number; winsWithFactor: number; hitRatePct: number | null }>;
  // Pro Wettbewerb.
  perCompetition: Array<{ competition: string; picks: number; wins: number; hitRatePct: number | null }>;
  // Einzelresultate (limit 20 fuer UI).
  topResults: BacktestMatchResult[];
  // Look-Ahead-Disclaimer.
  caveat: string;
}

function runOne(match: BacktestHistoricalMatch): BacktestMatchResult {
  const actualOutcome: 'home' | 'away' | 'draw' = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';

  const prediction = predictWmMatch({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    venue: match.venue || undefined,
    phase: ['Gruppe', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'].includes(match.phase) ? (match.phase as 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale') : 'Gruppe'
  });

  const conditions = evaluateWmConditions({
    fixture: {
      id: match.id,
      date: match.date,
      time: null,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      venue: match.venue || '',
      phase: ['Gruppe', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'].includes(match.phase) ? (match.phase as 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale') : 'Gruppe'
    }
  });
  const conditionsActiveFactorIds = conditions.factors.map((f) => f.id);

  // Filter analog zu rankWmWinnerPicks
  let blockReason: string | null = null;
  if (prediction.pick.clarity !== 'strong') blockReason = `clarity ${prediction.pick.clarity}`;
  else if (prediction.pick.winner !== 'home' && prediction.pick.winner !== 'away') blockReason = `winner ${prediction.pick.winner}`;
  else if (prediction.pick.confidencePct < 60) blockReason = `confidence ${prediction.pick.confidencePct}%`;
  else if (Math.abs(prediction.eloDiff) < 80) blockReason = `eloDiff ${prediction.eloDiff}`;
  else if (prediction.dataConfidence < 85) blockReason = `dataConfidence ${prediction.dataConfidence}`;
  else if (match.phase === 'Spiel um Platz 3') blockReason = 'Phase blacklisted';

  if (blockReason) {
    return {
      match,
      tier: 'kein-pick',
      winnerSide: null,
      winnerTeam: null,
      confidencePct: null,
      eloDiff: prediction.eloDiff,
      conditionsActiveFactorIds,
      blockReason,
      actualOutcome,
      outcome: 'kein-pick',
      brierScore: null
    };
  }

  const winnerSide = prediction.pick.winner as 'home' | 'away';
  const winnerTeam = winnerSide === 'home' ? match.homeTeam : match.awayTeam;
  const proTipper = evaluateProTipperAgent({
    eloDiff: prediction.eloDiff,
    pickClarity: prediction.pick.clarity,
    confidencePct: prediction.pick.confidencePct,
    expectedGoalsHome: prediction.expectedGoals.home,
    expectedGoalsAway: prediction.expectedGoals.away,
    winnerSide,
    daysUntilMatch: 1, // historisches Spiel = bereits gespielt
    isNeutralVenue: match.competition !== 'Freundschaft',
    dataConfidence: prediction.dataConfidence,
    lineupAvailable: true, // historisch: in der Praxis ja
    phase: ['Gruppe', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Spiel um Platz 3', 'Finale'].includes(match.phase) ? (match.phase as 'Gruppe' | 'Achtelfinale' | 'Viertelfinale' | 'Halbfinale' | 'Spiel um Platz 3' | 'Finale') : 'Gruppe',
    conditionsEloShift: eloDiffShift(conditions),
    conditionsConfidenceShift: conditions.confidenceShiftTotal,
    conditionsDataCoverage: conditions.dataCoverage
  });

  if (proTipper.status === 'BLOCKIERT') {
    return {
      match,
      tier: 'kein-pick',
      winnerSide: null,
      winnerTeam: null,
      confidencePct: prediction.pick.confidencePct,
      eloDiff: prediction.eloDiff,
      conditionsActiveFactorIds,
      blockReason: `ProTipper: ${proTipper.reason}`,
      actualOutcome,
      outcome: 'kein-pick',
      brierScore: null
    };
  }

  const tier: BacktestPickTier = (
    proTipper.status === 'OK' &&
    Math.abs(prediction.eloDiff) >= 120 &&
    prediction.pick.confidencePct >= 70 &&
    prediction.dataConfidence >= 90
  ) ? 'hoechste-konfluenz' : 'modell-favorit';

  // Outcome bestimmen
  let outcome: BacktestOutcome;
  if (actualOutcome === 'draw') outcome = 'remis';
  else if (actualOutcome === winnerSide) outcome = 'treffer';
  else outcome = 'daneben';

  // Brier-Score: pick_prob in [0,1] vs. actual in {0,1}. Remis zaehlt
  // halb (actual = 0.5) — bei einem Sieger-Pick ist ein Remis kein voller
  // Verlust, weil das Endergebnis "Sieger" knapp verfehlt wurde.
  const pickProb = prediction.pick.confidencePct / 100;
  const actualBinary = outcome === 'treffer' ? 1 : outcome === 'remis' ? 0.5 : 0;
  const brierScore = Math.pow(pickProb - actualBinary, 2);

  return {
    match,
    tier,
    winnerSide,
    winnerTeam,
    confidencePct: prediction.pick.confidencePct,
    eloDiff: prediction.eloDiff,
    conditionsActiveFactorIds,
    blockReason: null,
    actualOutcome,
    outcome,
    brierScore
  };
}

const FACTOR_IDS = ['acclimatization', 'altitude', 'jetlag', 'host-advantage', 'regional-crowd', 'hot-midday', 'rest-days', 'weather'] as const;

export function runWmBacktest(): BacktestReport {
  const results = WM_BACKTEST_DATASET.map(runOne);
  const picks = results.filter((r) => r.tier !== 'kein-pick');

  const hoechsteKonfluenzPicks = picks.filter((r) => r.tier === 'hoechste-konfluenz');
  const modellFavoritPicks = picks.filter((r) => r.tier === 'modell-favorit');

  const hitRate = (arr: BacktestMatchResult[]): number | null => {
    const decisive = arr.filter((r) => r.outcome === 'treffer' || r.outcome === 'daneben');
    if (decisive.length === 0) return null;
    return Math.round((decisive.filter((r) => r.outcome === 'treffer').length / decisive.length) * 100);
  };
  const meanBrier = (arr: BacktestMatchResult[]): number | null => {
    const scored = arr.filter((r) => r.brierScore !== null);
    if (scored.length === 0) return null;
    return Math.round((scored.reduce((s, r) => s + (r.brierScore as number), 0) / scored.length) * 1000) / 1000;
  };

  const factorImpact = FACTOR_IDS.map((id) => {
    const withFactor = picks.filter((r) => r.conditionsActiveFactorIds.includes(id));
    const decisive = withFactor.filter((r) => r.outcome === 'treffer' || r.outcome === 'daneben');
    const winsWith = decisive.filter((r) => r.outcome === 'treffer').length;
    return {
      factorId: id,
      picksWithFactor: withFactor.length,
      winsWithFactor: winsWith,
      hitRatePct: decisive.length > 0 ? Math.round((winsWith / decisive.length) * 100) : null
    };
  });

  const competitions = Array.from(new Set(WM_BACKTEST_DATASET.map((m) => m.competition)));
  const perCompetition = competitions.map((competition) => {
    const arr = picks.filter((r) => r.match.competition === competition);
    const decisive = arr.filter((r) => r.outcome === 'treffer' || r.outcome === 'daneben');
    const wins = decisive.filter((r) => r.outcome === 'treffer').length;
    return {
      competition,
      picks: arr.length,
      wins,
      hitRatePct: decisive.length > 0 ? Math.round((wins / decisive.length) * 100) : null
    };
  });

  const topResults = [...picks]
    .sort((a, b) => (b.confidencePct ?? 0) - (a.confidencePct ?? 0))
    .slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    totalMatches: WM_BACKTEST_DATASET.length,
    picksHoechsteKonfluenz: hoechsteKonfluenzPicks.length,
    picksModellFavorit: modellFavoritPicks.length,
    noPick: results.filter((r) => r.tier === 'kein-pick').length,
    hitRateHoechsteKonfluenzPct: hitRate(hoechsteKonfluenzPicks),
    hitRateModellFavoritPct: hitRate(modellFavoritPicks),
    hitRateCombinedPct: hitRate(picks),
    brierHoechsteKonfluenz: meanBrier(hoechsteKonfluenzPicks),
    brierModellFavorit: meanBrier(modellFavoritPicks),
    factorImpact,
    perCompetition,
    topResults,
    caveat: `ELO-Werte sind aktueller Snapshot (Stand Juni 2026), nicht zeit-versionsiert. Das gibt einen leichten Look-Ahead-Bias zugunsten der Top-Teams. Geographische Conditions (Klima, Hoehe, Jetlag) sind sauber. Datenbasis: ${WM_BACKTEST_DATASET.length} echte Top-Laenderspiele aus WM 2022 KO, EM 2024 KO, Copa America 2024 KO, Nations League Finals 2023/2024 und ausgewaehlte Freundschaftsspiele 2023/2024. Vergangenheit ist kein Versprechen fuer die Zukunft.`
  };
}

// Brier-Score-Mittel ueber Wins+Losses+Remis (nicht no-pick). Ehrlicher
// Gesamt-Score fuer die UI.
export function combinedBrier(report: BacktestReport): number | null {
  const totalBrier = (report.brierHoechsteKonfluenz ?? 0) * (report.picksHoechsteKonfluenz || 0)
                   + (report.brierModellFavorit ?? 0) * (report.picksModellFavorit || 0);
  const totalCount = (report.picksHoechsteKonfluenz || 0) + (report.picksModellFavorit || 0);
  if (totalCount === 0) return null;
  return Math.round((totalBrier / totalCount) * 1000) / 1000;
}

// 24-h Cache — der Backtest aendert sich nur wenn das Dataset oder die
// Engine wirklich aktualisiert wurden. Reine in-memory Berechnung,
// keine Netzwerk-Calls noetig.
export const getCachedWmBacktest = unstable_cache(
  async () => runWmBacktest(),
  ['wm-backtest-v1'],
  { revalidate: 60 * 60 * 24 }
);
