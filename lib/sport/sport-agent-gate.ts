// Sport Precision Desk — 4-Agent-Gate.
//
// Vier echte Pruefmodule, kein Show-Persona-System:
//   A) Datenpruefer   — offizielle Fixtures, TBD, Quellenabdeckung, Form-Sample.
//   B) Modellpruefer  — Marktstabilitaet, Modell-Konfluenz, Poisson/ELO-Konflikt.
//   C) Risiko-Veto    — enger Markt, fruehe Spieltermine, Confidence-Ueberlauf,
//                       sensitive Maerkte ohne Lineup/Verletzung.
//   D) Kalibrierungs- — Overconfidence im Bucket, zu kleine Historie, Brier
//      waechter         Score Schwelle.
//
// Jede Funktion liefert OK | WARNUNG | BLOCKIERT inklusive Kurzbegruendung.
// Regel: wenn irgendein Agent BLOCKIERT liefert, darf der Precision Desk
// keinen FREIGABE-Pick ausweisen — das wird beim Compose-Schritt erzwungen.
//
// Reine Funktion, keine I/O.

import type {
  AgentStatus,
  PrecisionAgentStatus,
  PrecisionPickInput
} from '@/lib/sport/sport-precision-gate';

const HIGH_SENSITIVE_MARKETS = [
  'btts', 'beide teams', 'unter 2,5', 'unter 2.5', 'unter 1,5', 'unter 1.5', 'clean sheet'
];
function isLineupSensitive(marketType: string): boolean {
  const m = marketType.toLowerCase();
  return HIGH_SENSITIVE_MARKETS.some((kw) => m.includes(kw));
}

function escalate(current: AgentStatus, next: AgentStatus): AgentStatus {
  const rank: Record<AgentStatus, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
  return rank[next] > rank[current] ? next : current;
}

export function evaluateDataAgent(input: PrecisionPickInput): PrecisionAgentStatus {
  let status: AgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.isTbdTeam) { status = escalate(status, 'BLOCKIERT'); reasons.push('TBD-Team'); }
  if (!input.hasOfficialFixture) { status = escalate(status, 'BLOCKIERT'); reasons.push('Fixture nicht offiziell'); }
  if (input.sourceCompleteness < 80) { status = escalate(status, 'BLOCKIERT'); reasons.push(`Quellen-Abdeckung ${Math.round(input.sourceCompleteness)} %`); }
  else if (input.sourceCompleteness < 90) { status = escalate(status, 'WARNUNG'); reasons.push(`Quellen-Abdeckung ${Math.round(input.sourceCompleteness)} %`); }
  if (input.formSampleSize < 5) { status = escalate(status, 'BLOCKIERT'); reasons.push(`Form-Stichprobe ${input.formSampleSize}`); }
  else if (input.formSampleSize < 8) { status = escalate(status, 'WARNUNG'); reasons.push(`Form-Stichprobe ${input.formSampleSize}`); }
  if (input.dataConfidence < 75) { status = escalate(status, 'BLOCKIERT'); reasons.push(`Daten-Confidence ${Math.round(input.dataConfidence)}`); }
  else if (input.dataConfidence < 85) { status = escalate(status, 'WARNUNG'); reasons.push(`Daten-Confidence ${Math.round(input.dataConfidence)}`); }
  if (reasons.length === 0) reasons.push('Daten vollstaendig, Stichprobe ausreichend.');
  return { id: 'data', label: 'Datenpruefer', status, reason: reasons.join(' · ') };
}

export function evaluateModelAgent(input: PrecisionPickInput): PrecisionAgentStatus {
  let status: AgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.modelDisagreement === 'HIGH') { status = escalate(status, 'BLOCKIERT'); reasons.push('Modelle widersprechen sich stark'); }
  else if (input.modelDisagreement === 'MEDIUM') { status = escalate(status, 'WARNUNG'); reasons.push('Modelle leicht uneinig'); }
  if (input.marketStability === 'WEAK') { status = escalate(status, 'BLOCKIERT'); reasons.push('Marktstabilitaet schwach'); }
  else if (input.marketStability === 'MEDIUM') { status = escalate(status, 'WARNUNG'); reasons.push('Marktstabilitaet mittel'); }
  // Poisson/ELO Konflikt-Check
  if (input.eloDiff !== null && input.expectedGoalsHome !== null && input.expectedGoalsAway !== null && Math.abs(input.eloDiff) >= 30) {
    const xgFavorsHome = input.expectedGoalsHome > input.expectedGoalsAway + 0.2;
    const xgFavorsAway = input.expectedGoalsAway > input.expectedGoalsHome + 0.2;
    if ((input.eloDiff > 80 && xgFavorsAway) || (input.eloDiff < -80 && xgFavorsHome)) {
      status = escalate(status, 'BLOCKIERT');
      reasons.push('Poisson und ELO widersprechen sich');
    }
  }
  // 1X2 hoch, aber xG eng -> Modell zieht aus ELO statt aus Spielbild.
  const isOneXTwo = /1x2|gewinnt|heimsieg|aussiteg|auswärtssieg|auswartssieg|remis|unentschieden|^1$|^x$|^2$/i.test(input.marketType);
  if (isOneXTwo && input.expectedGoalsHome !== null && input.expectedGoalsAway !== null) {
    const xgGap = Math.abs(input.expectedGoalsHome - input.expectedGoalsAway);
    if (xgGap < 0.15 && input.modelProbability >= 0.7) {
      status = escalate(status, 'BLOCKIERT');
      reasons.push('xG sagt engen Markt, 1X2 wird trotzdem stark angezeigt');
    }
  }
  // Probability nur durch ELO getrieben.
  if (input.eloDiff !== null && Math.abs(input.eloDiff) >= 100 && input.poissonConfidence !== null && input.poissonConfidence < 0.4 && input.modelProbability >= 0.7) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('Probability laeuft fast nur ueber ELO');
  }
  if (reasons.length === 0) reasons.push('Modell-Konfluenz vorhanden, kein Widerspruch.');
  return { id: 'model', label: 'Modellpruefer', status, reason: reasons.join(' · ') };
}

export function evaluateRiskAgent(input: PrecisionPickInput): PrecisionAgentStatus {
  let status: AgentStatus = 'OK';
  const reasons: string[] = [];
  // enger 1X2-Markt
  const isOneXTwo = /1x2|gewinnt|heimsieg|aussiteg|auswärtssieg|auswartssieg|remis|unentschieden|^1$|^x$|^2$/i.test(input.marketType);
  if (isOneXTwo && input.modelProbability < 0.60 && input.expectedGoalsHome !== null && input.expectedGoalsAway !== null) {
    const totalXg = input.expectedGoalsHome + input.expectedGoalsAway;
    if (totalXg >= 1.6) { status = escalate(status, 'BLOCKIERT'); reasons.push('enger 1X2-Markt ohne klaren Abstand'); }
  }
  // zu frueher Spieltermin
  if (input.daysUntilMatch > 60) { status = escalate(status, 'BLOCKIERT'); reasons.push(`${input.daysUntilMatch} Tage entfernt`); }
  else if (input.daysUntilMatch > 30) { status = escalate(status, 'WARNUNG'); reasons.push(`${input.daysUntilMatch} Tage entfernt`); }
  else if (input.daysUntilMatch > 14) { status = escalate(status, 'WARNUNG'); reasons.push(`${input.daysUntilMatch} Tage entfernt`); }
  // ueberhoehte Confidence: rawProbability sehr hoch, aber Daten duenn
  if (input.rawProbability >= 0.85 && (input.dataConfidence < 80 || input.qualityScore < 75)) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('ueberhoehte Roh-Confidence bei duenner Datenbasis');
  }
  if (input.dataConfidence < 75) { status = escalate(status, 'BLOCKIERT'); reasons.push('Datenqualitaet zu schwach'); }
  // sensible Maerkte ohne Lineup/Verletzung
  if (isLineupSensitive(input.marketType) && (!input.lineupDataAvailable || !input.injuryDataAvailable)) {
    if (input.daysUntilMatch <= 2) { status = escalate(status, 'BLOCKIERT'); reasons.push('Lineup/Verletzung kurz vor Anstoss nicht bekannt'); }
    else { status = escalate(status, 'WARNUNG'); reasons.push('Lineup/Verletzung noch nicht final'); }
  }
  if (reasons.length === 0) reasons.push('Kein Risiko-Veto aktiv.');
  return { id: 'risk', label: 'Risiko-Veto', status, reason: reasons.join(' · ') };
}

export function evaluateCalibrationAgent(input: PrecisionPickInput): PrecisionAgentStatus {
  let status: AgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.calibrationSampleSize < 10) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`Historie zu klein (${input.calibrationSampleSize})`);
  }
  if (input.historicalHitRateForBucket !== null && input.calibrationSampleSize >= 10) {
    const expected = Math.min(0.95, Math.max(0.55, input.modelProbability));
    const errPct = (expected - input.historicalHitRateForBucket) * 100;
    if (errPct > 12) { status = escalate(status, 'BLOCKIERT'); reasons.push(`Bucket trifft historisch ${Math.round(input.historicalHitRateForBucket * 100)} % statt erwartet ${Math.round(expected * 100)} %`); }
    else if (errPct > 6) { status = escalate(status, 'WARNUNG'); reasons.push(`Leichte Overconfidence im Bucket (${Math.round(errPct)} %)`); }
  }
  // Brier-Score: ueber 0.30 ist deutlich schwach (perfekt = 0, Zufall ~0.25).
  if (input.brierScoreForBucket !== null) {
    if (input.brierScoreForBucket > 0.32) { status = escalate(status, 'BLOCKIERT'); reasons.push(`Brier ${input.brierScoreForBucket.toFixed(2)} zu schwach`); }
    else if (input.brierScoreForBucket > 0.26) { status = escalate(status, 'WARNUNG'); reasons.push(`Brier ${input.brierScoreForBucket.toFixed(2)} grenzwertig`); }
  }
  if (input.calibrationLabel === 'UEBERSCHAETZT') { status = escalate(status, 'BLOCKIERT'); reasons.push('Bucket gilt als ueberschaetzt'); }
  if (reasons.length === 0) reasons.push('Kalibrierung im Backtest verlaesslich.');
  return { id: 'calibration', label: 'Kalibrierungswaechter', status, reason: reasons.join(' · ') };
}

export interface SportAgentReport {
  statuses: PrecisionAgentStatus[];
  // true wenn mindestens ein Agent BLOCKIERT — wirkt als globales Veto.
  hasBlocker: boolean;
  // true wenn mind. ein Agent WARNUNG (aber keiner BLOCKIERT).
  hasWarning: boolean;
}

export function evaluateSportAgents(input: PrecisionPickInput): SportAgentReport {
  const statuses = [
    evaluateDataAgent(input),
    evaluateModelAgent(input),
    evaluateRiskAgent(input),
    evaluateCalibrationAgent(input)
  ];
  const hasBlocker = statuses.some((s) => s.status === 'BLOCKIERT');
  const hasWarning = !hasBlocker && statuses.some((s) => s.status === 'WARNUNG');
  return { statuses, hasBlocker, hasWarning };
}
