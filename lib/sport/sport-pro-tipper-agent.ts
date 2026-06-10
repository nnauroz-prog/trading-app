// Profi-Tipper-Agent — zusaetzliche Pruef-Schicht ueber dem normalen
// Precision-Gate, spezialisiert auf Sieger-Tipps.
//
// Wie ein erfahrener Tipper schaut der Agent auf Signale, die das reine
// Statistik-Modell nicht von alleine abbildet:
//   - Spielerstaerke-Hinweise (Lineup-Verfuegbarkeit)
//   - xG-Konfluenz (passt das xG-Verhaeltnis zum 1X2-Pick?)
//   - Asymmetrische Verletzungs-Sensitivitaet (klare Favoriten verlieren
//     selten gegen Aussenseiter — ausser Lineup-Schock).
//   - Neutralvenue-Realitaet bei WM (kein echter Heimvorteil).
//   - Termin-Naehe (zu weit weg = Lineup nicht bewertbar).
//
// Liefert OK | WARNUNG | BLOCKIERT — BLOCKIERT verhindert den Pick.
// Reine Funktion. Wording strikt ohne verbotene Begriffe.

import type { WmFixture } from '@/lib/sport/wm-schedule-2026';

export type ProTipperStatus = 'OK' | 'WARNUNG' | 'BLOCKIERT';

export interface ProTipperInput {
  eloDiff: number;                  // signed
  pickClarity: 'strong' | 'leaning' | 'open';
  confidencePct: number;            // 0..100, Engine pick confidence
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  winnerSide: 'home' | 'away';
  daysUntilMatch: number;
  isNeutralVenue: boolean;
  dataConfidence: number;           // 0..100
  lineupAvailable: boolean;
  phase: WmFixture['phase'];
}

export interface ProTipperResult {
  status: ProTipperStatus;
  reason: string;
  // Anteil der Sub-Checks, die OK sind (0..1).
  conviction: number;
}

function escalate(c: ProTipperStatus, n: ProTipperStatus): ProTipperStatus {
  const rank: Record<ProTipperStatus, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
  return rank[n] > rank[c] ? n : c;
}

export function evaluateProTipperAgent(input: ProTipperInput): ProTipperResult {
  let status: ProTipperStatus = 'OK';
  const reasons: string[] = [];
  let okChecks = 0;
  let totalChecks = 0;

  // 1) Engine-Klarheit: nur strong-Picks ueberhaupt zugelassen.
  totalChecks += 1;
  if (input.pickClarity !== 'strong') {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Engine-Klarheit ${input.pickClarity}`);
  } else okChecks += 1;

  // 2) ELO-Vorzeichen passt zum Pick.
  totalChecks += 1;
  if ((input.winnerSide === 'home' && input.eloDiff <= 0) || (input.winnerSide === 'away' && input.eloDiff >= 0)) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('ELO widerspricht Sieger-Pick');
  } else okChecks += 1;

  // 3) xG-Konfluenz: erwartete Tore muessen zum Pick passen. Wenn
  // xG sagt "Auswaerts ueberlegen" aber Pick=Home, ist das Modell-
  // intern uneinig — wir nehmen den Pick raus.
  totalChecks += 1;
  const xgDelta = input.expectedGoalsHome - input.expectedGoalsAway;
  if (input.winnerSide === 'home' && xgDelta < -0.15) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('xG zeigt Auswaerts-Vorteil entgegen Pick');
  } else if (input.winnerSide === 'away' && xgDelta > 0.15) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('xG zeigt Heim-Vorteil entgegen Pick');
  } else okChecks += 1;

  // 4) Termin-Naehe: nicht zu weit weg, sonst Form/Lineup nicht
  // bewertbar. Bei WM tolerieren wir bis 7 Tage; ueber 10 Tage
  // wird es zu spekulativ.
  totalChecks += 1;
  if (input.daysUntilMatch > 10) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Spiel ${input.daysUntilMatch} Tage entfernt — Lineup nicht bewertbar`);
  } else if (input.daysUntilMatch > 5) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`${input.daysUntilMatch} Tage bis Anstoss — Form kann sich noch aendern`);
    okChecks += 0.5;
  } else okChecks += 1;

  // 5) Lineup-Verfuegbarkeit: nahe am Anstoss sollte sie da sein.
  // Bei T-Minus-1 ohne Lineup wird der Pick stark riskant.
  totalChecks += 1;
  if (input.daysUntilMatch <= 1 && !input.lineupAvailable) {
    status = escalate(status, 'WARNUNG');
    reasons.push('Lineup kurz vor Anstoss nicht verfuegbar');
    okChecks += 0.5;
  } else okChecks += 1;

  // 6) Daten-Confidence: muss hoch sein (beide Teams in ELO-DB).
  totalChecks += 1;
  if (input.dataConfidence < 80) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Daten-Confidence ${input.dataConfidence}`);
  } else okChecks += 1;

  // 7) Neutralvenue-Hinweis bei WM: ein "Heim"-Pick ist bei der WM
  // kein echter Heimvorteil (ausser Gastgeber). Bei knapper Engine-
  // Confidence senken wir den Pick auf WARNUNG.
  totalChecks += 1;
  if (input.isNeutralVenue && input.confidencePct < 65 && input.winnerSide === 'home') {
    status = escalate(status, 'WARNUNG');
    reasons.push('Engine-Heimvorteil greift auf WM nicht voll');
    okChecks += 0.5;
  } else okChecks += 1;

  // 8) Confidence-Schwelle.
  totalChecks += 1;
  if (input.confidencePct < 60) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Sieger-Quote nur ${input.confidencePct} %`);
  } else okChecks += 1;

  const conviction = okChecks / totalChecks;
  const reason = reasons.length > 0
    ? reasons.join(' · ')
    : 'Alle Profi-Tipper-Pruefungen bestanden.';
  return { status, reason, conviction };
}
