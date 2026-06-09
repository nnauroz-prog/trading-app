// Ehrlicher Backtest der Modifier: macht das H2H-/Schiri-Signal die
// Prognose tatsaechlich besser? Walk-Forward auf einem finishedPool:
// jeder vergangene Match wird mit einem Modell vorhergesagt, das NUR die
// VORHER liegenden Spiele kennt — einmal mit Modifier, einmal ohne.
//
// Metrik: Brier-Score (Standard fuer 1X2-Vorhersagen). Niedriger ist
// besser. Lift = (BrierRoh - BrierMitModifier) / BrierRoh.
// Positive Lift = Modifier macht das Modell besser. Negative Lift =
// Modifier macht es schlechter (dann sollten wir ihn ausschalten).
//
// Wetter laesst sich historisch nicht ehrlich backtesten (Open-Meteo
// hat nur Forecast, keine ehrliche historische Reanalyse free), also
// hier ausgelassen — wir testen H2H + Schiri.

import type { Fixture } from '@/lib/sport/fetcher';
import { computeFootballProbabilities } from '@/lib/sport/probabilities';
import { computeHeadToHead } from '@/lib/sport/h2h';

export interface ModifierBacktestResult {
  matchesEvaluated: number;
  brierRaw: number;
  brierWithH2h: number;
  brierWithReferee: number;
  brierWithBoth: number;
  // Lift in Prozent (positiv = Modifier hilft).
  liftH2hPct: number;
  liftRefereePct: number;
  liftCombinedPct: number;
  // Wieviele Matches hatten ueberhaupt ein H2H- bzw. Schiri-Signal?
  matchesWithH2hSignal: number;
  matchesWithRefereeSignal: number;
}

const EMPTY_RESULT: ModifierBacktestResult = {
  matchesEvaluated: 0,
  brierRaw: 0,
  brierWithH2h: 0,
  brierWithReferee: 0,
  brierWithBoth: 0,
  liftH2hPct: 0,
  liftRefereePct: 0,
  liftCombinedPct: 0,
  matchesWithH2hSignal: 0,
  matchesWithRefereeSignal: 0
};

// Mindestanzahl VOR dem zu testenden Match, damit das Modell ueberhaupt
// vernuenftig lernen kann.
const MIN_PRIOR_GAMES = 30;
// Mindestanzahl ausgewerteter Matches, damit das Ergebnis statistisch
// belastbar ist.
const MIN_EVALUATED = 20;

// 1X2-Outcome aus einem Spielergebnis ableiten.
function outcomeOf(home: number, away: number): 0 | 1 | 2 {
  if (home > away) return 0;
  if (home < away) return 2;
  return 1;
}

// Brier-Score fuer EIN Match. Niedriger ist besser. Max 2.
function brierScore(probs: { homeWin: number; draw: number; awayWin: number }, outcome: 0 | 1 | 2): number {
  const target = [outcome === 0 ? 1 : 0, outcome === 1 ? 1 : 0, outcome === 2 ? 1 : 0];
  const preds = [probs.homeWin, probs.draw, probs.awayWin];
  let s = 0;
  for (let i = 0; i < 3; i++) {
    s += (preds[i] - target[i]) ** 2;
  }
  return s;
}

export function backtestModifiers(finishedPool: Fixture[]): ModifierBacktestResult {
  // Pool chronologisch (aeltester zuerst).
  const sorted = [...finishedPool]
    .filter((f) => f.status === 'finished' && f.homeScore !== null && f.awayScore !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < MIN_PRIOR_GAMES + MIN_EVALUATED) return EMPTY_RESULT;

  let totalRaw = 0;
  let totalH2h = 0;
  let totalRef = 0;
  let totalBoth = 0;
  let n = 0;
  let nH2hSignal = 0;
  let nRefSignal = 0;

  for (let i = MIN_PRIOR_GAMES; i < sorted.length; i++) {
    const target = sorted[i];
    const prior = sorted.slice(0, i);
    const actualOutcome = outcomeOf(target.homeScore!, target.awayScore!);

    const rawProb = computeFootballProbabilities(target.homeTeam, target.awayTeam, prior);
    if (!rawProb) continue;

    const h2h = computeHeadToHead(target.homeTeam, target.awayTeam, prior);
    const refName = target.referee ?? null;
    const probH2h = computeFootballProbabilities(target.homeTeam, target.awayTeam, prior, undefined, h2h);
    const probRef = computeFootballProbabilities(target.homeTeam, target.awayTeam, prior, undefined, undefined, refName);
    const probBoth = computeFootballProbabilities(target.homeTeam, target.awayTeam, prior, undefined, h2h, refName);
    if (!probH2h || !probRef || !probBoth) continue;

    // Hatte H2H/Schiri ueberhaupt ein Signal? Vergleiche die Wahrscheinlich-
    // keiten — wenn sie identisch sind, war kein Signal aktiv.
    const h2hChanged = Math.abs(rawProb.homeWin - probH2h.homeWin) > 0.001;
    const refChanged = Math.abs(rawProb.homeWin - probRef.homeWin) > 0.001;
    if (h2hChanged) nH2hSignal++;
    if (refChanged) nRefSignal++;

    totalRaw += brierScore(rawProb, actualOutcome);
    totalH2h += brierScore(probH2h, actualOutcome);
    totalRef += brierScore(probRef, actualOutcome);
    totalBoth += brierScore(probBoth, actualOutcome);
    n++;
  }

  if (n < MIN_EVALUATED) return { ...EMPTY_RESULT, matchesEvaluated: n };

  const brierRaw = totalRaw / n;
  const brierH2h = totalH2h / n;
  const brierRef = totalRef / n;
  const brierBoth = totalBoth / n;

  const lift = (raw: number, mod: number) => (raw === 0 ? 0 : Math.round(((raw - mod) / raw) * 1000) / 10);

  return {
    matchesEvaluated: n,
    brierRaw: Math.round(brierRaw * 1000) / 1000,
    brierWithH2h: Math.round(brierH2h * 1000) / 1000,
    brierWithReferee: Math.round(brierRef * 1000) / 1000,
    brierWithBoth: Math.round(brierBoth * 1000) / 1000,
    liftH2hPct: lift(brierRaw, brierH2h),
    liftRefereePct: lift(brierRaw, brierRef),
    liftCombinedPct: lift(brierRaw, brierBoth),
    matchesWithH2hSignal: nH2hSignal,
    matchesWithRefereeSignal: nRefSignal
  };
}
