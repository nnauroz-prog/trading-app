// Odds-/Value-Layer fuer das Sport Precision System.
//
// Verbindet die Modell-Wahrscheinlichkeit mit (ggf. vorhandenen)
// Buchmacher-Quoten und liefert ein klares Value-Label plus eine
// Signal-Anpassung (FREIGABE / BEOBACHTEN / HIGH_RISK / NICHT_VERWENDEN).
//
// Ehrlichkeits-Leitplanken:
// * Keine Fake- oder Platzhalter-Quoten — wenn keine Quote vorhanden,
//   bleibt valueLabel === 'NO_QUOTE'.
// * Keine Garantie-Sprache.
// * HIGH RISK ist niemals eine Freigabe.
// * "Einsatz-Hinweis" ist Risiko-Hinweis, keine Empfehlung.
//
// Reine Funktion. Keine I/O.

import type {
  PrecisionVerdict,
  MarketStability,
  ModelDisagreement
} from '@/lib/sport/sport-precision-gate';
import type { CalibrationLabel } from '@/lib/sport/sport-calibration';

export type SportRiskMode = 'PRECISION' | 'BALANCED' | 'HIGH_RISK';

export type SportSignal = 'FREIGABE' | 'BEOBACHTEN' | 'HIGH_RISK' | 'NICHT_VERWENDEN';

export type ValueLabel = 'VALUE' | 'FAIR' | 'NO_VALUE' | 'DANGEROUS' | 'NO_QUOTE';

export interface SportOddsValueInput {
  // Modell-Wahrscheinlichkeit (0..1).
  modelProbability: number;
  // Angezeigte (gedeckelte) Wahrscheinlichkeit (0..1).
  displayProbability: number;
  // Dezimal-Quote vom Buchmacher oder manuell eingegeben. null wenn
  // keine Quote vorliegt — dann gibt es keinen Value-Check.
  decimalOdds: number | null;
  marketType: string;
  dataConfidence: number;          // 0..100
  qualityScore: number;            // 0..100
  marketStability: MarketStability;
  modelDisagreement: ModelDisagreement;
  calibrationLabel: CalibrationLabel;
  // Ausgangs-Signal aus dem Precision Gate. Wird ggf. nach Value-
  // und Risiko-Pruefung angepasst.
  baseVerdict: PrecisionVerdict;
  // Pflicht-Felder fuer HIGH_RISK-Pruefung:
  hasOfficialFixture: boolean;
  isTbdTeam: boolean;
  isPairingVerified: boolean;
  sourceCompleteness: number;       // 0..100
  hasHardBlocker: boolean;
  riskMode: SportRiskMode;
}

export interface SportOddsValueOutput {
  // Implizite Buchmacher-Wahrscheinlichkeit aus der Quote (0..1) oder null.
  impliedProbability: number | null;
  // model - implied, in Prozentpunkten (0..100 Skala). null wenn keine
  // Quote vorhanden.
  valueEdge: number | null;
  // Expected Value = model * odds - 1 (Dezimal-Bruchteil). null ohne Quote.
  expectedValue: number | null;
  valueLabel: ValueLabel;
  // Klartext-Warnung wenn die Quote auf etwas Verdaechtiges hindeutet
  // (z. B. attraktive Quote, aber schwache Daten).
  oddsWarning: string | null;
  // Finales angepasstes Signal nach Beruecksichtigung von Value und
  // riskMode.
  adjustedSignal: SportSignal;
  reasons: string[];
  blockers: string[];
}

// Schwellen — zentral, damit Tests und UI dasselbe Bild ziehen.
export const VALUE_THRESHOLDS = {
  // VALUE benoetigt mindestens +5 ppt Edge.
  edgeMinValuePpt: 5,
  // FAIR-Band: -3..+5 ppt rund um Edge 0.
  fairBandLowPpt: -3,
  fairBandHighPpt: 5,
  // Datenqualitaets-Untergrenzen fuer VALUE-Freigabe.
  valueMinDataConfidence: 80,
  valueMinQualityScore: 75,
  // HIGH_RISK-Pruefung.
  highRiskMinModelProb: 0.58,
  highRiskMinEdgePpt: 7,
  highRiskMinDataConfidence: 65,
  highRiskMinQualityScore: 60,
  highRiskMinSourceCompleteness: 65
} as const;

export function decimalOddsToImpliedProbability(decimalOdds: number): number {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return 0;
  return 1 / decimalOdds;
}

export function calculateValueEdge(modelProbability: number, impliedProbability: number): number {
  // Liefert die Differenz in Prozentpunkten (0..100 Skala).
  return Math.round((modelProbability - impliedProbability) * 1000) / 10;
}

export function calculateExpectedValue(modelProbability: number, decimalOdds: number): number {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return 0;
  return Math.round((modelProbability * decimalOdds - 1) * 1000) / 1000;
}

function isCalibrationOverestimated(label: CalibrationLabel): boolean {
  return label === 'UEBERSCHAETZT';
}

export function classifyValueSignal(input: SportOddsValueInput): { valueLabel: ValueLabel; valueEdge: number | null; impliedProbability: number | null; expectedValue: number | null; oddsWarning: string | null; } {
  if (input.decimalOdds === null) {
    return {
      valueLabel: 'NO_QUOTE',
      valueEdge: null,
      impliedProbability: null,
      expectedValue: null,
      oddsWarning: null
    };
  }
  const impliedProbability = decimalOddsToImpliedProbability(input.decimalOdds);
  if (impliedProbability === 0) {
    return {
      valueLabel: 'NO_QUOTE',
      valueEdge: null,
      impliedProbability: null,
      expectedValue: null,
      oddsWarning: 'Quote ungueltig.'
    };
  }
  const valueEdge = calculateValueEdge(input.modelProbability, impliedProbability);
  const expectedValue = calculateExpectedValue(input.modelProbability, input.decimalOdds);

  // DANGEROUS: hohe Quote sieht attraktiv aus, aber Datenlage ist
  // schwach oder Kalibrierung ueberschaetzt — bewusst kein Value.
  const dangerousData = input.dataConfidence < VALUE_THRESHOLDS.valueMinDataConfidence
    || input.qualityScore < VALUE_THRESHOLDS.valueMinQualityScore;
  const dangerousMarket = input.marketStability === 'WEAK'
    || input.modelDisagreement === 'HIGH'
    || isCalibrationOverestimated(input.calibrationLabel);
  const looksAttractive = valueEdge >= VALUE_THRESHOLDS.edgeMinValuePpt;
  if (looksAttractive && (dangerousData || dangerousMarket)) {
    return {
      valueLabel: 'DANGEROUS',
      valueEdge,
      impliedProbability,
      expectedValue,
      oddsWarning: 'Hohe Quote bei schwacher Datenlage oder instabilem Markt — Vorsicht.'
    };
  }

  // VALUE: harte Pflicht-Untergrenzen
  const valueOk = input.modelProbability > impliedProbability
    && valueEdge >= VALUE_THRESHOLDS.edgeMinValuePpt
    && input.dataConfidence >= VALUE_THRESHOLDS.valueMinDataConfidence
    && input.qualityScore >= VALUE_THRESHOLDS.valueMinQualityScore
    && input.marketStability !== 'WEAK'
    && input.calibrationLabel !== 'UEBERSCHAETZT'
    && !input.hasHardBlocker;
  if (valueOk) {
    return {
      valueLabel: 'VALUE',
      valueEdge,
      impliedProbability,
      expectedValue,
      oddsWarning: null
    };
  }

  // FAIR: kleine Edge im Band
  if (valueEdge >= VALUE_THRESHOLDS.fairBandLowPpt && valueEdge < VALUE_THRESHOLDS.fairBandHighPpt) {
    return {
      valueLabel: 'FAIR',
      valueEdge,
      impliedProbability,
      expectedValue,
      oddsWarning: null
    };
  }

  // NO_VALUE: model <= implied, Quote schlechter als Modell
  return {
    valueLabel: 'NO_VALUE',
    valueEdge,
    impliedProbability,
    expectedValue,
    oddsWarning: null
  };
}

// HIGH_RISK-Pruefung. Liefert true wenn der Pick als spekulative
// Value-Idee anzeigbar ist, false wenn er auch in HIGH_RISK blockiert
// bleiben muss. Pflicht-Kriterien aus dem Master-Prompt.
export function canShowAsHighRisk(
  input: SportOddsValueInput,
  classification: ReturnType<typeof classifyValueSignal>
): { canShow: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (input.isTbdTeam) blockers.push('Team TBD — kein HIGH RISK.');
  if (!input.hasOfficialFixture) blockers.push('Fixture nicht offiziell — kein HIGH RISK.');
  if (!input.isPairingVerified) blockers.push('Paarung nicht verifiziert — kein HIGH RISK.');
  if (input.modelProbability < VALUE_THRESHOLDS.highRiskMinModelProb) {
    blockers.push(`Modell-Wahrscheinlichkeit zu niedrig (< ${(VALUE_THRESHOLDS.highRiskMinModelProb * 100).toFixed(0)} %).`);
  }
  if (classification.valueEdge === null || classification.valueEdge < VALUE_THRESHOLDS.highRiskMinEdgePpt) {
    blockers.push(`Value-Edge unter ${VALUE_THRESHOLDS.highRiskMinEdgePpt} ppt oder keine Quote.`);
  }
  if (input.decimalOdds === null) {
    blockers.push('Keine Quote — Value nicht berechenbar.');
  }
  if (input.dataConfidence < VALUE_THRESHOLDS.highRiskMinDataConfidence) {
    blockers.push(`Datenkonfidenz zu niedrig (< ${VALUE_THRESHOLDS.highRiskMinDataConfidence}).`);
  }
  if (input.qualityScore < VALUE_THRESHOLDS.highRiskMinQualityScore) {
    blockers.push(`Quality-Score zu niedrig (< ${VALUE_THRESHOLDS.highRiskMinQualityScore}).`);
  }
  if (input.sourceCompleteness < VALUE_THRESHOLDS.highRiskMinSourceCompleteness) {
    blockers.push(`Quellen-Vollstaendigkeit zu niedrig (< ${VALUE_THRESHOLDS.highRiskMinSourceCompleteness} %).`);
  }
  if (input.marketStability === 'WEAK') blockers.push('Markt komplett instabil.');
  if (input.modelDisagreement === 'HIGH') blockers.push('Modellwiderspruch extrem.');
  if (input.hasHardBlocker) blockers.push('Kritischer Datenintegritaets-Blocker aktiv.');
  return { canShow: blockers.length === 0, blockers };
}

export function applyOddsRiskAdjustment(input: SportOddsValueInput): SportOddsValueOutput {
  const classification = classifyValueSignal(input);
  const reasons: string[] = [];
  const blockers: string[] = [];

  // Standard-Reasons aufnehmen.
  if (classification.valueLabel === 'VALUE') reasons.push('Modell ueber implizierter Quote (Value-Edge ueber Schwelle).');
  if (classification.valueLabel === 'FAIR') reasons.push('Modell entspricht implizierter Quote (kein klares Value-Signal).');
  if (classification.valueLabel === 'NO_VALUE') reasons.push('Modell unter implizierter Quote — kein theoretischer Value.');
  if (classification.valueLabel === 'DANGEROUS') {
    reasons.push('Hohe Quote attraktiv, Datenqualitaet oder Markt zu schwach.');
    blockers.push('Risiko-Profil zu hoch fuer Freigabe.');
  }
  if (classification.valueLabel === 'NO_QUOTE') reasons.push('Keine Quote vorhanden — Value nicht berechnet.');

  // Standard: Verdict aus Precision Gate uebernehmen.
  let adjustedSignal: SportSignal;
  switch (input.baseVerdict) {
    case 'FREIGABE': adjustedSignal = 'FREIGABE'; break;
    case 'BEOBACHTEN': adjustedSignal = 'BEOBACHTEN'; break;
    case 'NICHT_VERWENDEN': adjustedSignal = 'NICHT_VERWENDEN'; break;
  }

  // VALUE darf eine FREIGABE staerken (Sortier-Hinweis), aber niemals
  // ein NICHT_VERWENDEN in FREIGABE drehen.
  // DANGEROUS schiebt eine FREIGABE auf BEOBACHTEN herunter (Sicher-
  // heitsnetz).
  if (classification.valueLabel === 'DANGEROUS' && adjustedSignal === 'FREIGABE') {
    adjustedSignal = 'BEOBACHTEN';
    reasons.push('FREIGABE gedaempft wegen DANGEROUS-Klassifikation.');
  }

  // HIGH_RISK-Mode: zeigt spekulative Picks, aber niemals als FREIGABE.
  if (input.riskMode === 'HIGH_RISK' && input.baseVerdict === 'NICHT_VERWENDEN') {
    const high = canShowAsHighRisk(input, classification);
    if (high.canShow) {
      adjustedSignal = 'HIGH_RISK';
      reasons.push('HIGH RISK / SPEKULATIV — Value-Idee ohne Freigabe.');
    } else {
      adjustedSignal = 'NICHT_VERWENDEN';
      blockers.push(...high.blockers);
    }
  }

  // PRECISION-Mode: BEOBACHTEN bleibt erlaubt (siehe Akzeptanzkriterien:
  // PRECISION zeigt nur sehr strenge Modell-Freigaben oben; das wird
  // im Selektor priorisiert, hier nicht hart gefiltert).
  // BALANCED-Mode: Standardverhalten ist OK.

  // HIGH RISK darf nie ueber einer echten FREIGABE stehen — wird im
  // Selektor priorisiert, hier nur klar markiert.

  return {
    impliedProbability: classification.impliedProbability,
    valueEdge: classification.valueEdge,
    expectedValue: classification.expectedValue,
    valueLabel: classification.valueLabel,
    oddsWarning: classification.oddsWarning,
    adjustedSignal,
    reasons,
    blockers
  };
}

// Sortier-Schluessel fuer die Priorisierung im Precision Desk.
//   1. FREIGABE mit VALUE
//   2. FREIGABE ohne Quote / FAIR / NO_VALUE
//   3. BEOBACHTEN mit VALUE
//   4. HIGH_RISK mit VALUE
//   5. BEOBACHTEN ohne Quote
//   6. NICHT_VERWENDEN
// HIGH RISK darf nie ueber einer echten FREIGABE stehen — durch die
// Reihenfolge in der Tabelle automatisch erfuellt.
export function priorityRank(o: SportOddsValueOutput): number {
  const s = o.adjustedSignal;
  const v = o.valueLabel;
  if (s === 'FREIGABE' && v === 'VALUE') return 1;
  if (s === 'FREIGABE') return 2;
  if (s === 'BEOBACHTEN' && v === 'VALUE') return 3;
  if (s === 'HIGH_RISK' && v === 'VALUE') return 4;
  if (s === 'HIGH_RISK') return 4;
  if (s === 'BEOBACHTEN') return 5;
  return 6;
}
