// Bridge zwischen bestehenden Sport-Engines und dem Precision Desk.
//
// Erzeugt `PrecisionPickInput`-Eintraege aus den existierenden Quellen
// (Fetcher, Predictor, Probabilities, Quality-Score, League-Data-Quality)
// und ruft `evaluateSportPrecisionPick` + Agenten-Gate fuer jeden auf.
//
// Reine Funktion. Kein I/O — alle Datenquellen werden als Parameter
// reingereicht. Damit bleibt die Bridge testbar und SSR-konform.

import type { LeagueFixtures, UpcomingFixture } from '@/lib/sport/fetcher';
import type { FootballProbabilityModel } from '@/lib/sport/probabilities';
import type { MatchPrediction } from '@/lib/sport/predictor';
import { computePredictionQualityScore, pickStablePrediction } from '@/lib/sport/prediction-quality-score';
import { leagueDataQuality } from '@/lib/sport/league-data-quality';
import {
  evaluateSportPrecisionPick,
  type PrecisionPickInput,
  type PrecisionPickResult,
  type MarketStability,
  type ModelDisagreement
} from '@/lib/sport/sport-precision-gate';
import { evaluateSportAgents } from '@/lib/sport/sport-agent-gate';
import {
  bucketizeProbability,
  calculateBucketStats,
  type CalibrationBucketStats
} from '@/lib/sport/sport-calibration';

export interface PrecisionPickWithAgents extends PrecisionPickResult {
  homeTeam: string;
  awayTeam: string;
  league: string;
  dateIso: string;
  timeIso: string | null;
}

interface BuildOptions {
  todayIso: string;
  bucketStats?: CalibrationBucketStats[];
  totalCalibrationSample?: number;
}

function daysBetween(todayIso: string, fixtureDate: string): number {
  const t = new Date(`${todayIso}T00:00:00`).getTime();
  const f = new Date(`${fixtureDate}T00:00:00`).getTime();
  return Math.round((f - t) / (24 * 60 * 60 * 1000));
}

// Heuristik fuer Markt-Stabilitaet: stabile Maerkte = Doppelchance + Tor-
// Maerkte; instabil = exakte Ergebnisse oder enges 1X2 ohne Abstand.
function deriveMarketStability(marketType: string, modelProbability: number, prob: FootballProbabilityModel | null): MarketStability {
  const m = marketType.toLowerCase();
  const isExact = /\d+\s*:\s*\d+/.test(m);
  if (isExact) return 'WEAK';
  const stableKw = ['ueber', 'über', 'unter', 'doppelchance', 'beide teams', 'kein remis', 'btts'];
  const isStable = stableKw.some((kw) => m.includes(kw));
  if (isStable && modelProbability >= 0.75) return 'STRONG';
  if (isStable && modelProbability >= 0.65) return 'MEDIUM';
  // 1X2
  if (prob) {
    const sorted = [prob.homeWin, prob.draw, prob.awayWin].sort((a, b) => b - a);
    const gap = sorted[0] - sorted[1];
    if (gap >= 0.25 && modelProbability >= 0.7) return 'STRONG';
    if (gap >= 0.12) return 'MEDIUM';
  }
  return 'WEAK';
}

// Heuristik fuer Modell-Disagreement: vergleicht pickStablePrediction-Output
// vs. predictor.pickSide. Wenn unterschiedlich → MEDIUM/HIGH je nach Distanz.
function deriveModelDisagreement(
  recommendationMarket: string,
  prediction: MatchPrediction,
  prob: FootballProbabilityModel | null
): ModelDisagreement {
  // Wenn Form-Predictor und xG-Probabilities deutlich auseinanderliegen:
  // 1X2 vs Tor-Markt-Empfehlung kann normal sein. Wir vergleichen die Roh-
  // 1X2-Wahrscheinlichkeiten aus Form vs aus xG.
  if (!prob) return 'MEDIUM';
  // Differenzen pHome/pAway.
  const dh = Math.abs(prediction.pHome - prob.homeWin);
  const da = Math.abs(prediction.pAway - prob.awayWin);
  const maxDiff = Math.max(dh, da);
  if (maxDiff > 0.18) return 'HIGH';
  if (maxDiff > 0.09) return 'MEDIUM';
  // Recommendation passt nicht zur staerksten 1X2-Stimme?
  const isOneXTwoRec = recommendationMarket.toLowerCase().includes('gewinnt') || recommendationMarket.toLowerCase().includes('remis');
  if (isOneXTwoRec) {
    const sides = [prediction.pHome, prediction.pDraw, prediction.pAway];
    const probSides = [prob.homeWin, prob.draw, prob.awayWin];
    const predTop = sides.indexOf(Math.max(...sides));
    const probTop = probSides.indexOf(Math.max(...probSides));
    if (predTop !== probTop) return 'HIGH';
  }
  return 'LOW';
}

// Quality der Liga-Datenbasis als Source-Completeness 0..100.
function deriveSourceCompleteness(leagueDataGoodPct: number, dataQuality: 'weak' | 'medium' | 'good'): number {
  // goodDataPct + Boost je nach Liga-Daten-Qualitaet, gedeckelt 100.
  const boost = dataQuality === 'good' ? 10 : dataQuality === 'medium' ? 0 : -10;
  return Math.max(0, Math.min(100, leagueDataGoodPct + boost));
}

// dataConfidence 0..100 abgeleitet aus Probability-Confidence + sampleSize.
function deriveDataConfidence(
  modelConfidence: 'low' | 'medium' | 'high',
  dataQuality: 'weak' | 'medium' | 'good',
  sampleSize: number
): number {
  const confBase = modelConfidence === 'high' ? 80 : modelConfidence === 'medium' ? 65 : 45;
  const qualityBoost = dataQuality === 'good' ? 10 : dataQuality === 'medium' ? 0 : -10;
  const sampleBoost = Math.min(10, sampleSize / 3);
  return Math.max(0, Math.min(100, Math.round(confBase + qualityBoost + sampleBoost)));
}

function pickFromRecommendation(
  fixture: UpcomingFixture,
  leagueName: string,
  prediction: MatchPrediction,
  prob: FootballProbabilityModel | null,
  leagueGoodDataPct: number,
  opts: BuildOptions
): PrecisionPickWithAgents | null {
  if (!prob) return null;
  const recommendation = pickStablePrediction(prediction, prob);
  const sampleSize = (prob.homeGamesUsed ?? prediction.homeGames ?? 0) + (prob.awayGamesUsed ?? prediction.awayGames ?? 0);
  const quality = computePredictionQualityScore({ fixture, recommendation, sampleSize });
  const dataConfidence = deriveDataConfidence(prob.modelConfidence, prob.dataQuality, sampleSize);
  const sourceCompleteness = deriveSourceCompleteness(leagueGoodDataPct, prob.dataQuality);
  const marketStability = deriveMarketStability(recommendation.label, recommendation.probability, prob);
  const modelDisagreement = deriveModelDisagreement(recommendation.label, prediction, prob);
  const formSampleSize = Math.min(prediction.homeGames ?? 0, prediction.awayGames ?? 0);
  const daysUntilMatch = Math.max(0, daysBetween(opts.todayIso, fixture.date));
  const isTbd = fixture.homeTeam.includes('TBD') || fixture.awayTeam.includes('TBD');
  const hasOfficialFixture = !isTbd && !!fixture.id;
  // Calibration: schau im uebergebenen bucketStats nach.
  const bucket = bucketizeProbability(recommendation.probability);
  let historicalHitRateForBucket: number | null = null;
  const brierScoreForBucket: number | null = null;
  let calibrationLabel: 'KALIBRIERT' | 'UNKLAR' | 'UEBERSCHAETZT' | undefined = undefined;
  if (bucket && opts.bucketStats) {
    const stat = opts.bucketStats.find((s) => s.bucket === bucket) ?? null;
    if (stat) {
      historicalHitRateForBucket = stat.historicalHitRate;
      calibrationLabel = stat.label;
    }
  }

  const input: PrecisionPickInput = {
    matchId: fixture.id,
    competitionType: 'LEAGUE',
    league: leagueName,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    marketType: recommendation.label,
    modelProbability: recommendation.probability,
    rawProbability: recommendation.probability,
    dataConfidence,
    qualityScore: quality.score,
    eloDiff: null,
    expectedGoalsHome: prob.expectedHomeGoals,
    expectedGoalsAway: prob.expectedAwayGoals,
    poissonConfidence: prob.modelConfidence === 'high' ? 0.7 : prob.modelConfidence === 'medium' ? 0.5 : 0.3,
    formSampleSize,
    h2hSampleSize: prob.headToHead.totalGames,
    homeAwaySampleSize: sampleSize,
    homeAwayDataAvailable: sampleSize >= 6,
    injuryDataAvailable: false,            // Quelle nicht angebunden — ehrlich melden
    lineupDataAvailable: false,            // Quelle nicht angebunden — ehrlich melden
    daysUntilMatch,
    hasOfficialFixture,
    isTbdTeam: isTbd,
    marketStability,
    modelDisagreement,
    sourceCompleteness,
    isFutureTournamentFixture: false,
    isNeutralVenue: false,
    venueKnown: !!fixture.venue,
    resultTrackingAvailable: true,
    calibrationSampleSize: opts.totalCalibrationSample ?? 0,
    historicalHitRateForBucket,
    brierScoreForBucket,
    calibrationLabel
  };

  const agentReport = evaluateSportAgents(input);
  // Wenn ein Agent BLOCKIERT, erzwingen wir NICHT_VERWENDEN.
  const baseResult = evaluateSportPrecisionPick({ ...input, agentStatuses: agentReport.statuses });
  let finalResult = baseResult;
  if (agentReport.hasBlocker && baseResult.verdict === 'FREIGABE') {
    finalResult = { ...baseResult, verdict: 'NICHT_VERWENDEN', blockers: [...baseResult.blockers, 'Agenten-Veto aktiv'] };
  }
  // Wenn nicht FREIGABE-Kontext, aber alle Pflichten erfuellt waeren — wir
  // muessen Agenten-Blocker mit ihrem Grund in die Blocker-Liste pushen.
  if (agentReport.hasBlocker && !baseResult.blockers.length) {
    const reasons = agentReport.statuses.filter((s) => s.status === 'BLOCKIERT').map((s) => `${s.label}: ${s.reason}`);
    finalResult = { ...finalResult, blockers: [...finalResult.blockers, ...reasons], verdict: 'NICHT_VERWENDEN' };
  }

  return {
    ...finalResult,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    league: leagueName,
    dateIso: fixture.date,
    timeIso: fixture.time ?? null
  };
}

// Hauptfunktion: nimmt LeagueFixtures, baut fuer jeden upcoming Fixture
// genau einen Precision-Pick (basierend auf dem stabilsten Markt).
export function buildLeaguePrecisionPicks(
  leagues: LeagueFixtures[],
  opts: BuildOptions
): PrecisionPickWithAgents[] {
  const out: PrecisionPickWithAgents[] = [];
  for (const lf of leagues) {
    const dq = leagueDataQuality(lf);
    for (const f of lf.next) {
      if (!f.prediction || !f.probabilities) continue;
      const pick = pickFromRecommendation(f, lf.league.name, f.prediction, f.probabilities, dq.goodDataPct, opts);
      if (pick) out.push(pick);
    }
  }
  return out;
}

// Erzeugt Calibration-Bucket-Stats aus dem Tip-Journal — wir mappen
// outcome 'win' → 1, 'loss' → 0, ignorieren 'push' und 'pending'.
export interface MinimalTipJournalEntry {
  outcome: 'pending' | 'win' | 'loss' | 'push';
  modelProbabilityPct: number;
  market: string;
  league: string;
  qualityScore?: number;
  dataQuality?: 'good' | 'medium' | 'weak';
  resolvedAt?: number;
}

export function buildCalibrationFromJournal(log: MinimalTipJournalEntry[]): { stats: CalibrationBucketStats[]; total: number } {
  const records = log
    .filter((e) => e.outcome === 'win' || e.outcome === 'loss')
    .map((e) => ({
      predictedProbability: Math.max(0, Math.min(1, e.modelProbabilityPct / 100)),
      actualOutcome: (e.outcome === 'win' ? 1 : 0) as 0 | 1,
      marketType: e.market,
      league: e.league,
      dataConfidence: e.dataQuality === 'good' ? 90 : e.dataQuality === 'medium' ? 70 : 50,
      qualityScore: e.qualityScore ?? 50,
      timestamp: e.resolvedAt ?? 0
    }));
  return { stats: calculateBucketStats(records), total: records.length };
}
