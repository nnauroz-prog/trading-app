// WM Precision Bridge — mappt WM-Fixtures + WmMatchPrediction auf
// PrecisionPickInput und durchlaeuft das gleiche Sport-Precision-Gate
// wie die Liga-Picks. Damit gilt fuer WM-Spiele exakt dieselbe
// FREIGABE/BEOBACHTEN/NICHT_VERWENDEN-Logik.
//
// WM-Spezialregeln (im Auftrag gefordert):
//   - TBD-Teams (Sieger/Verlierer/Zweiter X) blockieren als isTbdTeam=true.
//   - Fixtures der Turnier-Spaeter-Phasen (Achtel-/Viertel-/...-Finale)
//     mit noch nicht feststehenden Mannschaften werden ebenfalls blockiert.
//   - hasOfficialFixture nur wenn der Spielort feststeht UND beide Teams
//     gesetzt sind.
//   - Turnier-Spiele tendieren eher zu BEOBACHTEN ausser alle Daten- und
//     Kalibrierungs-Regeln sind erfuellt — das macht der Risiko-Veto-Agent
//     bereits ueber daysUntilMatch.

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';
import { predictWmMatch, type WmMatchPrediction } from '@/lib/sport/wm-match-engine';
import { listWmMarkets, type WmMarketRecommendation } from '@/lib/sport/wm-best-market';
import {
  evaluateSportPrecisionPick,
  type PrecisionPickInput
} from '@/lib/sport/sport-precision-gate';
import { evaluateSportAgents } from '@/lib/sport/sport-agent-gate';
import type { PrecisionPickWithAgents } from '@/lib/sport/sport-precision-bridge';
import {
  bucketizeProbability,
  type CalibrationBucketStats
} from '@/lib/sport/sport-calibration';

interface BuildOptions {
  todayIso: string;
  horizonDays?: number;       // wie viele Tage voraus geschaut wird
  bucketStats?: CalibrationBucketStats[];
  totalCalibrationSample?: number;
}

function daysBetween(todayIso: string, fixtureIso: string): number {
  const t = new Date(`${todayIso}T00:00:00`).getTime();
  const f = new Date(`${fixtureIso}T00:00:00`).getTime();
  return Math.round((f - t) / (24 * 60 * 60 * 1000));
}

function isTbd(team: string): boolean {
  const t = team.trim();
  if (t.includes('TBD')) return true;
  if (/^(Sieger|Verlierer|Zweiter|Erster)\s/i.test(t)) return true;
  return false;
}

function deriveMarketStability(label: string, probability: number): PrecisionPickInput['marketStability'] {
  const m = label.toLowerCase();
  const isExact = /\d+\s*:\s*\d+/.test(m);
  if (isExact) return 'WEAK';
  const stableKw = ['ueber', 'über', 'unter', 'doppelchance', 'beide teams', 'kein remis', 'btts'];
  const isStable = stableKw.some((kw) => m.includes(kw));
  if (isStable && probability >= 0.75) return 'STRONG';
  if (isStable && probability >= 0.65) return 'MEDIUM';
  return 'WEAK';
}

function buildInputForMarket(
  fixture: WmFixture,
  prediction: WmMatchPrediction,
  market: WmMarketRecommendation,
  opts: BuildOptions
): PrecisionPickInput {
  const tbd = isTbd(fixture.homeTeam) || isTbd(fixture.awayTeam);
  const officialFixture = !tbd && !!fixture.venue;
  const daysUntilMatch = Math.max(0, daysBetween(opts.todayIso, fixture.date));
  // dataConfidence kommt direkt aus der WM-Engine (0..100), bei TBD ohnehin
  // niedrig oder durch isTbdTeam-Blocker schon kaputt.
  const dataConfidence = prediction.dataConfidence;
  // Quality-Score: nimmt dataConfidence als Basis + Markt-Stabilitaets-Bonus.
  const marketStability = deriveMarketStability(market.market, market.probability);
  const stabilityBonus = marketStability === 'STRONG' ? 10 : marketStability === 'MEDIUM' ? 5 : 0;
  const qualityScore = Math.max(0, Math.min(100, Math.round(dataConfidence * 0.8 + market.probability * 20 + stabilityBonus)));
  // SourceCompleteness: hat das Spielort+Phase+Teams definiert? Bei WM-Fixtures
  // gibt es kaum externe Quellen-Variation — wir leiten aus officialFixture ab.
  const sourceCompleteness = officialFixture ? 92 : 60;
  // formSampleSize bei WM: harte Frage, weil Nationalmannschaften
  // unregelmaessig spielen. Wir nehmen ELO-Sample-Annahme: wenn beide Teams
  // in der ELO-DB sind (dataConfidence > 60), zaehlen wir das als 5+.
  const formSampleSize = dataConfidence >= 60 ? 8 : 2;
  // calibrationLabel: WM hat (noch) keine eigene Historie — UNKLAR.
  const bucket = bucketizeProbability(market.probability);
  let historicalHitRateForBucket: number | null = null;
  let calibrationLabel: 'KALIBRIERT' | 'UNKLAR' | 'UEBERSCHAETZT' | undefined = 'UNKLAR';
  if (bucket && opts.bucketStats) {
    const stat = opts.bucketStats.find((s) => s.bucket === bucket) ?? null;
    if (stat) {
      historicalHitRateForBucket = stat.historicalHitRate;
      calibrationLabel = stat.label;
    }
  }
  return {
    matchId: fixture.id,
    competitionType: 'TOURNAMENT',
    league: `WM ${fixture.phase}${fixture.group ? ` ${fixture.group}` : ''}`,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    marketType: market.market,
    modelProbability: market.probability,
    rawProbability: market.probability,
    dataConfidence,
    qualityScore,
    eloDiff: prediction.eloDiff,
    expectedGoalsHome: prediction.expectedGoals.home,
    expectedGoalsAway: prediction.expectedGoals.away,
    poissonConfidence: prediction.pick.clarity === 'strong' ? 0.7 : prediction.pick.clarity === 'leaning' ? 0.5 : 0.3,
    formSampleSize,
    h2hSampleSize: 0,
    homeAwaySampleSize: formSampleSize,
    homeAwayDataAvailable: formSampleSize >= 5,
    injuryDataAvailable: false,     // wird ehrlich gemeldet, vor Anstoss fuehrt das zum Cap
    lineupDataAvailable: false,
    daysUntilMatch,
    hasOfficialFixture: officialFixture,
    isTbdTeam: tbd,
    marketStability,
    modelDisagreement: prediction.pick.clarity === 'open' ? 'HIGH' : 'LOW',
    sourceCompleteness,
    isFutureTournamentFixture: daysUntilMatch > 3,
    isNeutralVenue: true,
    venueKnown: !!fixture.venue,
    resultTrackingAvailable: true,
    calibrationSampleSize: opts.totalCalibrationSample ?? 0,
    historicalHitRateForBucket,
    brierScoreForBucket: null,
    calibrationLabel
  };
}

// Pro Fixture wird der STAERKSTE Markt gewaehlt — analog zu Liga.
function strongestMarketFor(prediction: WmMatchPrediction): WmMarketRecommendation | null {
  const all = listWmMarkets(prediction);
  if (all.length === 0) return null;
  return all.reduce((best, m) => (m.probability > best.probability ? m : best), all[0]);
}

export function buildWmPrecisionPicks(opts: BuildOptions): PrecisionPickWithAgents[] {
  const { todayIso, horizonDays = 40 } = opts;
  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const horizonMs = todayMs + horizonDays * 24 * 60 * 60 * 1000;
  const out: PrecisionPickWithAgents[] = [];
  for (const f of WM_2026_FIXTURES) {
    const fMs = new Date(`${f.date}T00:00:00`).getTime();
    if (fMs < todayMs || fMs > horizonMs) continue;
    const prediction = predictWmMatch({ homeTeam: f.homeTeam, awayTeam: f.awayTeam, venue: f.venue, phase: f.phase });
    const market = strongestMarketFor(prediction);
    if (!market) continue;
    const input = buildInputForMarket(f, prediction, market, opts);
    const agentReport = evaluateSportAgents(input);
    const baseResult = evaluateSportPrecisionPick({ ...input, agentStatuses: agentReport.statuses });
    let finalResult = baseResult;
    if (agentReport.hasBlocker && baseResult.verdict === 'FREIGABE') {
      finalResult = { ...baseResult, verdict: 'NICHT_VERWENDEN', blockers: [...baseResult.blockers, 'Agenten-Veto aktiv'] };
    }
    if (agentReport.hasBlocker && baseResult.blockers.length === 0) {
      const reasons = agentReport.statuses.filter((s) => s.status === 'BLOCKIERT').map((s) => `${s.label}: ${s.reason}`);
      finalResult = { ...finalResult, blockers: [...finalResult.blockers, ...reasons], verdict: 'NICHT_VERWENDEN' };
    }
    out.push({
      ...finalResult,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      league: input.league,
      dateIso: f.date,
      timeIso: f.time ?? null
    });
  }
  return out;
}
