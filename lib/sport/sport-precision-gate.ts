// Sport Precision Desk — Pflicht-Gate.
//
// Deterministischer Pruef-Filter: ein Pick wird nur dann freigegeben, wenn
// Datenqualitaet, Modellkonfluenz, Marktstabilitaet und Kalibrierung alle
// stimmen. Sobald ein harter Blocker aktiv ist, geht der Pick auf
// NICHT_VERWENDEN.
//
// Reine Funktion, keine I/O, keine UI. Strikt entlang der Schwellen-Tabelle
// im Auftrag — wenn Schwellen veraendert werden muessen, hier zentral.
//
// Hinweis Wording: alle Reasons/Blockers/Warnings vermeiden Garantie-
// Sprache. Verwendet werden nur neutrale Modell-Begriffe wie Konfluenz,
// Freigabe oder Modell-Tendenz.

import type { CalibrationLabel } from '@/lib/sport/sport-calibration';

export type PrecisionVerdict = 'FREIGABE' | 'BEOBACHTEN' | 'NICHT_VERWENDEN';
export type MarketStability = 'STRONG' | 'MEDIUM' | 'WEAK';
export type ModelDisagreement = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskLabel = 'LOW' | 'MEDIUM' | 'HIGH';
export type DataLabel = 'VOLLSTAENDIG' | 'TEILWEISE' | 'SCHWACH';
export type CompetitionType = 'LEAGUE' | 'TOURNAMENT' | 'FRIENDLY';
export type AgentStatus = 'OK' | 'WARNUNG' | 'BLOCKIERT';

export interface PrecisionAgentStatus {
  id: 'data' | 'model' | 'risk' | 'calibration';
  label: string;
  status: AgentStatus;
  reason: string;
}

export interface PrecisionPickInput {
  matchId: string;
  competitionType: CompetitionType;
  league: string;
  homeTeam: string;
  awayTeam: string;
  marketType: string;
  // Roh-Wahrscheinlichkeit aus dem Modell (0..1).
  modelProbability: number;
  rawProbability: number;
  dataConfidence: number;      // 0..100
  qualityScore: number;        // 0..100
  eloDiff: number | null;
  expectedGoalsHome: number | null;
  expectedGoalsAway: number | null;
  poissonConfidence: number | null; // 0..1
  formSampleSize: number;
  h2hSampleSize: number;
  homeAwaySampleSize: number;
  homeAwayDataAvailable: boolean;
  injuryDataAvailable: boolean;
  lineupDataAvailable: boolean;
  daysUntilMatch: number;
  hasOfficialFixture: boolean;
  isTbdTeam: boolean;
  marketStability: MarketStability;
  modelDisagreement: ModelDisagreement;
  sourceCompleteness: number;        // 0..100
  isFutureTournamentFixture: boolean;
  isNeutralVenue: boolean;
  venueKnown: boolean;
  resultTrackingAvailable: boolean;
  calibrationSampleSize: number;
  historicalHitRateForBucket: number | null; // 0..1
  brierScoreForBucket: number | null;
  // Optional: bereits berechnetes Kalibrierungs-Label fuer dieses Bucket,
  // sonst leitet das Gate es aus historicalHitRate/erwartete Quote ab.
  calibrationLabel?: CalibrationLabel;
  // Optional: Agenten-Status. Wenn nicht gesetzt, ermitteln wir es spaeter.
  agentStatuses?: PrecisionAgentStatus[];
}

export interface PrecisionPickResult {
  matchId: string;
  marketType: string;
  verdict: PrecisionVerdict;
  precisionScore: number;       // 0..100
  rawProbability: number;       // 0..1
  displayProbability: number;   // 0..1, kapped
  confidenceCap: number;        // 0..100, finale Decke in Prozent
  reasons: string[];
  blockers: string[];
  warnings: string[];
  agentStatuses: PrecisionAgentStatus[];
  shouldShowAsTopPick: boolean;
  riskLabel: RiskLabel;
  dataLabel: DataLabel;
  calibrationLabel: CalibrationLabel;
}

// Schwellen — zentral, damit Tests und UI dasselbe Bild ziehen.
export const PRECISION_THRESHOLDS = {
  dataConfidence: { min: 75, freigabe: 85 },
  qualityScore: { min: 70, freigabe: 80 },
  modelProbability: { min: 0.70, freigabe: 0.78 },
  sourceCompleteness: { min: 80, freigabe: 90 },
  formSampleSize: { min: 5 },
  daysUntilMatchTooFar: 60,
  daysUntilMatchObserve: 7,
  daysUntilMatchCap14: 14,
  daysUntilMatchCap30: 30
} as const;

// Confidence-Caps in Prozentpunkten (UI zeigt anschliessend Math.min cap, rawProb).
export const CONFIDENCE_CAPS: Record<string, number> = {
  base: 100,
  dataConfidenceLow: 70,
  qualityScoreLow: 68,
  sourceCompletenessLow: 66,
  marketStabilityWeak: 65,
  modelDisagreementHigh: 64,
  formSampleSizeLow: 63,
  daysOver14: 72,
  daysOver30: 65,
  lineupMissing: 70,
  injuryMissing: 70,
  smallCalibrationSample: 72
};

const HIGH_LINEUP_SENSITIVE_MARKETS = [
  'btts', 'beide teams', 'unter 2,5', 'unter 2.5', 'unter 1,5', 'unter 1.5', 'clean sheet'
];

function isLineupSensitiveMarket(marketType: string): boolean {
  const m = marketType.toLowerCase();
  return HIGH_LINEUP_SENSITIVE_MARKETS.some((kw) => m.includes(kw));
}

// Heuristik: Poisson + ELO widersprechen sich, wenn das Vorzeichen der
// ELO-Differenz nicht mit dem xG-Verhaeltnis uebereinstimmt.
function poissonEloConflict(input: PrecisionPickInput): boolean {
  if (input.eloDiff === null || input.expectedGoalsHome === null || input.expectedGoalsAway === null) return false;
  if (Math.abs(input.eloDiff) < 30) return false;
  const xgFavorsHome = input.expectedGoalsHome > input.expectedGoalsAway + 0.2;
  const xgFavorsAway = input.expectedGoalsAway > input.expectedGoalsHome + 0.2;
  if (input.eloDiff > 80 && xgFavorsAway) return true;
  if (input.eloDiff < -80 && xgFavorsHome) return true;
  return false;
}

// Heuristik: Probability wirkt nur wegen ELO hoch, wenn xG-Confidence
// niedrig und gleichzeitig ELO-Diff stark.
function probabilityDrivenOnlyByElo(input: PrecisionPickInput): boolean {
  if (input.eloDiff === null) return false;
  if (Math.abs(input.eloDiff) < 100) return false;
  if (input.poissonConfidence !== null && input.poissonConfidence >= 0.4) return false;
  return input.modelProbability >= 0.7;
}

// Enger 1X2-Markt ohne klaren Abstand — Differenz Sieger zu zweitstaerkstem
// Outcome zu klein.
function tightOneXTwoWithoutGap(input: PrecisionPickInput): boolean {
  const m = input.marketType.toLowerCase();
  if (!(m.includes('1x2') || m === '1' || m === 'x' || m === '2' || m.includes('gewinnt') || m.includes('heimsieg') || m.includes('auswaertssieg') || m.includes('auswärtssieg') || m.includes('remis') || m.includes('unentschieden'))) {
    return false;
  }
  if (input.expectedGoalsHome === null || input.expectedGoalsAway === null) return false;
  const totalXg = input.expectedGoalsHome + input.expectedGoalsAway;
  if (totalXg < 1.6) return false; // niedrige xG → 1X2 nicht „eng" sondern „defensiv".
  // Wenn modelProbability < 60 % bei 1X2, ist das ein enger Markt.
  return input.modelProbability < 0.60;
}

function calibrationOverestimated(input: PrecisionPickInput): boolean {
  if (input.calibrationLabel === 'UEBERSCHAETZT') return true;
  if (input.historicalHitRateForBucket === null) return false;
  if (input.calibrationSampleSize < 10) return false;
  // expected = midpoint des Buckets. Wenn modelProbability >= 80 %, ist
  // expected ~0.85; trifft die Historie nur 0.65, ist das UEBERSCHAETZT.
  const expected = Math.min(0.95, Math.max(0.55, input.modelProbability));
  return (expected - input.historicalHitRateForBucket) * 100 > 10;
}

function dataLabelFor(sourceCompleteness: number, dataConfidence: number, formSampleSize: number): DataLabel {
  if (sourceCompleteness >= 90 && dataConfidence >= 85 && formSampleSize >= 5) return 'VOLLSTAENDIG';
  if (sourceCompleteness >= 80 && dataConfidence >= 75) return 'TEILWEISE';
  return 'SCHWACH';
}

function riskLabelFor(input: PrecisionPickInput, blockers: string[]): RiskLabel {
  if (blockers.length > 0) return 'HIGH';
  if (input.marketStability === 'WEAK' || input.modelDisagreement === 'HIGH') return 'HIGH';
  if (input.marketStability === 'MEDIUM' || input.modelDisagreement === 'MEDIUM') return 'MEDIUM';
  if (!input.injuryDataAvailable || !input.lineupDataAvailable) return 'MEDIUM';
  if (input.daysUntilMatch > 14) return 'MEDIUM';
  return 'LOW';
}

// Sammelt alle aktiven Confidence-Caps und gibt das Minimum zurueck.
function computeConfidenceCap(input: PrecisionPickInput): { cap: number; warnings: string[] } {
  const warnings: string[] = [];
  let cap = CONFIDENCE_CAPS.base;
  const applyCap = (newCap: number, reason: string) => {
    if (newCap < cap) {
      cap = newCap;
    }
    warnings.push(reason);
  };
  if (input.dataConfidence < 80) applyCap(CONFIDENCE_CAPS.dataConfidenceLow, 'Daten-Confidence unter 80 — Anzeige gedeckelt.');
  if (input.qualityScore < 75) applyCap(CONFIDENCE_CAPS.qualityScoreLow, 'Quality-Score unter 75 — Anzeige gedeckelt.');
  if (input.sourceCompleteness < 85) applyCap(CONFIDENCE_CAPS.sourceCompletenessLow, 'Quellen-Abdeckung unter 85 % — Anzeige gedeckelt.');
  if (input.marketStability === 'WEAK') applyCap(CONFIDENCE_CAPS.marketStabilityWeak, 'Marktstabilitaet schwach — Anzeige gedeckelt.');
  if (input.modelDisagreement === 'HIGH') applyCap(CONFIDENCE_CAPS.modelDisagreementHigh, 'Modelle widersprechen sich — Anzeige gedeckelt.');
  if (input.formSampleSize < 5) applyCap(CONFIDENCE_CAPS.formSampleSizeLow, 'Form-Stichprobe unter 5 — Anzeige gedeckelt.');
  if (input.daysUntilMatch > PRECISION_THRESHOLDS.daysUntilMatchCap30) applyCap(CONFIDENCE_CAPS.daysOver30, 'Spiel mehr als 30 Tage entfernt — Anzeige gedeckelt.');
  else if (input.daysUntilMatch > PRECISION_THRESHOLDS.daysUntilMatchCap14) applyCap(CONFIDENCE_CAPS.daysOver14, 'Spiel mehr als 14 Tage entfernt — Anzeige gedeckelt.');
  if (!input.lineupDataAvailable) applyCap(CONFIDENCE_CAPS.lineupMissing, 'Aufstellungen unbekannt — Anzeige gedeckelt.');
  if (!input.injuryDataAvailable) applyCap(CONFIDENCE_CAPS.injuryMissing, 'Verletzungsdaten fehlen — Anzeige gedeckelt.');
  if (input.calibrationSampleSize < 10) applyCap(CONFIDENCE_CAPS.smallCalibrationSample, 'Kalibrierungs-Historie zu klein — Anzeige gedeckelt.');
  // Kalibrierungs-Ueberschaetzung wird im Result direkt verrechnet.
  if (calibrationOverestimated(input)) applyCap(60, 'Historische Trefferquote unter Erwartung — Anzeige gedeckelt.');
  return { cap, warnings };
}

// Sammelt alle aktiven harten Blocker.
function collectBlockers(input: PrecisionPickInput): string[] {
  const blockers: string[] = [];
  if (input.isTbdTeam) blockers.push('Team noch nicht bestaetigt (TBD).');
  if (!input.hasOfficialFixture) blockers.push('Fixture nicht offiziell bestaetigt.');
  if (input.dataConfidence < PRECISION_THRESHOLDS.dataConfidence.min) blockers.push(`Daten-Confidence ${Math.round(input.dataConfidence)} unter Schwelle ${PRECISION_THRESHOLDS.dataConfidence.min}.`);
  if (input.qualityScore < PRECISION_THRESHOLDS.qualityScore.min) blockers.push(`Quality-Score ${Math.round(input.qualityScore)} unter Schwelle ${PRECISION_THRESHOLDS.qualityScore.min}.`);
  if (input.modelProbability < PRECISION_THRESHOLDS.modelProbability.min) blockers.push(`Modell-Wahrscheinlichkeit ${Math.round(input.modelProbability * 100)} % unter ${Math.round(PRECISION_THRESHOLDS.modelProbability.min * 100)} %.`);
  if (input.sourceCompleteness < PRECISION_THRESHOLDS.sourceCompleteness.min) blockers.push(`Quellen-Abdeckung ${Math.round(input.sourceCompleteness)} % unter ${PRECISION_THRESHOLDS.sourceCompleteness.min} %.`);
  if (input.marketStability === 'WEAK') blockers.push('Marktstabilitaet schwach.');
  if (input.modelDisagreement === 'HIGH') blockers.push('Modelle widersprechen sich stark.');
  if (input.formSampleSize < PRECISION_THRESHOLDS.formSampleSize.min) blockers.push(`Form-Stichprobe ${input.formSampleSize} unter ${PRECISION_THRESHOLDS.formSampleSize.min}.`);
  if (probabilityDrivenOnlyByElo(input)) blockers.push('Prognose laeuft fast nur ueber ELO — xG/Form ist zu duenn.');
  if (input.daysUntilMatch > PRECISION_THRESHOLDS.daysUntilMatchTooFar) blockers.push(`Spiel liegt mehr als ${PRECISION_THRESHOLDS.daysUntilMatchTooFar} Tage entfernt — Form/Lineups nicht sinnvoll bewertbar.`);
  if (tightOneXTwoWithoutGap(input)) blockers.push('Enger 1X2-Markt ohne klaren Abstand.');
  if (calibrationOverestimated(input)) blockers.push('Kalibrierung zeigt klare Ueberschaetzung im Bucket.');
  // Lineup/Verletzung: nur Blocker, wenn Markt davon stark abhaengt UND
  // Spiel kurz bevorsteht.
  const kickoffSoon = input.daysUntilMatch <= 2;
  const sensitive = isLineupSensitiveMarket(input.marketType);
  if (sensitive && kickoffSoon && (!input.lineupDataAvailable || !input.injuryDataAvailable)) {
    blockers.push('Markt reagiert stark auf Lineups/Verletzungen — Daten fehlen kurz vor Anstoss.');
  }
  return blockers;
}

// Sammelt BEOBACHTEN-Indikatoren (nur wenn keine harten Blocker aktiv).
function collectObserveReasons(input: PrecisionPickInput): string[] {
  const reasons: string[] = [];
  if (input.dataConfidence >= 75 && input.dataConfidence < 85) reasons.push(`Daten-Confidence ${Math.round(input.dataConfidence)} — solide, aber nicht stark.`);
  if (input.qualityScore >= 70 && input.qualityScore < 80) reasons.push(`Quality-Score ${Math.round(input.qualityScore)} unter 80.`);
  if (input.modelProbability >= 0.70 && input.modelProbability < 0.78) reasons.push(`Modell-Wahrscheinlichkeit ${Math.round(input.modelProbability * 100)} % unter 78 %.`);
  if (input.sourceCompleteness >= 80 && input.sourceCompleteness < 90) reasons.push(`Quellen-Abdeckung ${Math.round(input.sourceCompleteness)} % unter 90 %.`);
  if (input.marketStability === 'MEDIUM') reasons.push('Marktstabilitaet mittel.');
  if (input.modelDisagreement === 'MEDIUM') reasons.push('Modelle leicht uneinig.');
  if (!input.injuryDataAvailable || !input.lineupDataAvailable) reasons.push('Einzelne Datenluecken (Aufstellung/Verletzung).');
  if (input.calibrationLabel === 'UNKLAR' || input.calibrationSampleSize < 10) reasons.push('Kalibrierung unklar — Historie zu duenn.');
  if (input.daysUntilMatch > PRECISION_THRESHOLDS.daysUntilMatchObserve) reasons.push(`Spiel ${input.daysUntilMatch} Tage entfernt — Form/Lineups koennen sich noch aendern.`);
  if (input.isFutureTournamentFixture) reasons.push('Turnier-Fixture: Formlage und Lineup unsicher.');
  if (input.competitionType === 'TOURNAMENT' && input.competitionType !== 'TOURNAMENT') reasons.push('Turnierkontext.');
  return reasons;
}

// FREIGABE-Vorbedingungen vollstaendig erfuellt?
function allFreigabeConditionsMet(input: PrecisionPickInput, blockers: string[]): boolean {
  if (blockers.length > 0) return false;
  if (input.dataConfidence < PRECISION_THRESHOLDS.dataConfidence.freigabe) return false;
  if (input.qualityScore < PRECISION_THRESHOLDS.qualityScore.freigabe) return false;
  if (input.modelProbability < PRECISION_THRESHOLDS.modelProbability.freigabe) return false;
  if (input.sourceCompleteness < PRECISION_THRESHOLDS.sourceCompleteness.freigabe) return false;
  if (input.marketStability !== 'STRONG') return false;
  if (input.modelDisagreement !== 'LOW') return false;
  if (input.formSampleSize < PRECISION_THRESHOLDS.formSampleSize.min) return false;
  if (!input.homeAwayDataAvailable) return false;
  if (!input.hasOfficialFixture) return false;
  if (input.isTbdTeam) return false;
  if (poissonEloConflict(input)) return false;
  if (input.calibrationLabel === 'UEBERSCHAETZT') return false;
  if (input.calibrationSampleSize < 10) return false;
  return true;
}

// Precision-Score 0..100. Gewichtet die Kern-Signale + Penalisierung.
function computePrecisionScore(input: PrecisionPickInput): number {
  // 5 Kern-Faktoren: Daten (25), Quality (25), Modell-Prob (20),
  // Markt-Stabilitaet (15), Modell-Einigkeit (15) = 100.
  const dataPart = Math.max(0, Math.min(25, (input.dataConfidence / 100) * 25));
  const qualityPart = Math.max(0, Math.min(25, (input.qualityScore / 100) * 25));
  const probPart = Math.max(0, Math.min(20, input.modelProbability * 20));
  const stabilityMap: Record<MarketStability, number> = { STRONG: 15, MEDIUM: 9, WEAK: 0 };
  const disagreementMap: Record<ModelDisagreement, number> = { LOW: 15, MEDIUM: 9, HIGH: 0 };
  let score = dataPart + qualityPart + probPart + stabilityMap[input.marketStability] + disagreementMap[input.modelDisagreement];
  // Penalty fuer fehlende Lineup/Injury im sensiblen Markt.
  if (isLineupSensitiveMarket(input.marketType) && (!input.lineupDataAvailable || !input.injuryDataAvailable)) {
    score -= 8;
  }
  if (input.daysUntilMatch > PRECISION_THRESHOLDS.daysUntilMatchCap14) score -= 4;
  if (input.daysUntilMatch > PRECISION_THRESHOLDS.daysUntilMatchCap30) score -= 4;
  if (input.calibrationLabel === 'UEBERSCHAETZT') score -= 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveCalibrationLabel(input: PrecisionPickInput): CalibrationLabel {
  if (input.calibrationLabel) return input.calibrationLabel;
  if (input.calibrationSampleSize < 10 || input.historicalHitRateForBucket === null) return 'UNKLAR';
  const expected = Math.min(0.95, Math.max(0.55, input.modelProbability));
  const errPct = (expected - input.historicalHitRateForBucket) * 100;
  if (errPct > 8) return 'UEBERSCHAETZT';
  return 'KALIBRIERT';
}

export function evaluateSportPrecisionPick(input: PrecisionPickInput): PrecisionPickResult {
  const blockers = collectBlockers(input);
  const { cap, warnings } = computeConfidenceCap(input);
  const calibrationLabel = deriveCalibrationLabel(input);

  const observeReasons = collectObserveReasons(input);

  let verdict: PrecisionVerdict;
  if (blockers.length > 0) {
    verdict = 'NICHT_VERWENDEN';
  } else if (allFreigabeConditionsMet(input, blockers) && observeReasons.length === 0) {
    verdict = 'FREIGABE';
  } else {
    verdict = 'BEOBACHTEN';
  }

  // Confidence-Cap finalisieren — in Prozentpunkten, dann auf 0..1 fuer
  // die Anzeige umgerechnet. Rohwert nie ueberschreiten.
  const capFraction = Math.max(0, Math.min(1, cap / 100));
  const displayProbability = Math.min(input.modelProbability, capFraction);

  const reasons: string[] = [];
  if (verdict === 'FREIGABE') {
    reasons.push(`Daten-Konfluenz ${Math.round(input.dataConfidence)} und Quality-Score ${Math.round(input.qualityScore)} ueber Freigabe-Schwelle.`);
    reasons.push(`Modell-Wahrscheinlichkeit ${Math.round(input.modelProbability * 100)} % bei stabiler Markt-Stuetze.`);
    if (calibrationLabel === 'KALIBRIERT') reasons.push('Bucket ist im Backtest kalibriert.');
    else reasons.push('Modell-Konfluenz reicht trotz unklarer Kalibrierung — Anzeige bleibt konservativ gedeckelt.');
  } else if (verdict === 'BEOBACHTEN') {
    reasons.push(...observeReasons.slice(0, 3));
  } else {
    reasons.push(...blockers.slice(0, 3));
  }

  const precisionScore = computePrecisionScore(input);
  const riskLabel = riskLabelFor(input, blockers);
  const dataLabel = dataLabelFor(input.sourceCompleteness, input.dataConfidence, input.formSampleSize);

  return {
    matchId: input.matchId,
    marketType: input.marketType,
    verdict,
    precisionScore,
    rawProbability: input.rawProbability,
    displayProbability,
    confidenceCap: cap,
    reasons,
    blockers,
    warnings,
    agentStatuses: input.agentStatuses ?? [],
    shouldShowAsTopPick: verdict !== 'NICHT_VERWENDEN',
    riskLabel,
    dataLabel,
    calibrationLabel
  };
}
