// Instrument Precision Gate — gemeinsamer Decision-Filter fuer Aktien
// UND Rohstoffe. Beide nutzen dasselbe InstrumentSafetyAssessment-Shape
// (score/grade/maxSafety/criteria), also reicht eine Pure-Lib statt zwei.
//
// Output ist das gleiche 3-Verdict-System wie beim Krypto- und Sport-
// Precision-Desk: FREIGABE | BEOBACHTEN | NICHT_VERWENDEN.

import type { InstrumentSafetyAssessment } from '@/lib/market/instrument-safety';

export type InstrumentPrecisionVerdict = 'FREIGABE' | 'BEOBACHTEN' | 'NICHT_VERWENDEN';
export type InstrumentAgentStatus = 'OK' | 'WARNUNG' | 'BLOCKIERT';
export type InstrumentKind = 'stock' | 'commodity';

export interface InstrumentAgentResult {
  id: 'data' | 'model' | 'risk' | 'calibration';
  label: string;
  status: InstrumentAgentStatus;
  reason: string;
}

export interface InstrumentPrecisionInput {
  symbol: string;
  name: string;
  group: string;
  kind: InstrumentKind;
  price: number;
  safety: InstrumentSafetyAssessment;
  // Optional: Marktbreiten-Kontext (DAX/SPX-Tagestrend). Wenn null,
  // bleibt der Modellpruefer neutral.
  marketTrendPct?: number | null;
  // Optional: Backtest-Hit-Rate fuer das Universum (z. B. Sektor-Backtest).
  backtestHitRatePct?: number | null;
  backtestSampleSize?: number;
}

export interface InstrumentPrecisionResult {
  symbol: string;
  name: string;
  group: string;
  kind: InstrumentKind;
  verdict: InstrumentPrecisionVerdict;
  precisionScore: number;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  agentStatuses: InstrumentAgentResult[];
  shouldShowAsTopPick: boolean;
  riskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
}

function escalate(c: InstrumentAgentStatus, n: InstrumentAgentStatus): InstrumentAgentStatus {
  const rank: Record<InstrumentAgentStatus, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
  return rank[n] > rank[c] ? n : c;
}

function dataAgent(input: InstrumentPrecisionInput): InstrumentAgentResult {
  let status: InstrumentAgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.safety.passedHard < input.safety.totalHard - 2) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Nur ${input.safety.passedHard}/${input.safety.totalHard} Kriterien erfuellt`);
  } else if (!input.safety.maxSafety) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`${input.safety.passedHard}/${input.safety.totalHard} Kriterien erfuellt`);
  }
  if (reasons.length === 0) reasons.push('Alle Pflicht-Kriterien aus dem Safety-Scan erfuellt.');
  return { id: 'data', label: 'Datenpruefer', status, reason: reasons.join(' · ') };
}

function modelAgent(input: InstrumentPrecisionInput): InstrumentAgentResult {
  let status: InstrumentAgentStatus = 'OK';
  const reasons: string[] = [];
  // Aktien: Markttrend stark negativ blockiert. Rohstoffe folgen oft eigener
  // Dynamik (Gold steigt bei fallender Boerse), daher kein Markt-Veto.
  if (input.kind === 'stock' && typeof input.marketTrendPct === 'number') {
    if (input.marketTrendPct <= -2) {
      status = escalate(status, 'BLOCKIERT');
      reasons.push(`Marktbreite ${input.marketTrendPct.toFixed(1)} % (Risk-Off)`);
    } else if (input.marketTrendPct <= -1) {
      status = escalate(status, 'WARNUNG');
      reasons.push(`Marktbreite ${input.marketTrendPct.toFixed(1)} %`);
    }
  }
  if (input.safety.grade === 'D') {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('Grade D');
  } else if (input.safety.grade === 'C') {
    status = escalate(status, 'WARNUNG');
    reasons.push('Grade C');
  }
  if (reasons.length === 0) reasons.push('Markt-Kontext und Grade konfluent.');
  return { id: 'model', label: 'Modellpruefer', status, reason: reasons.join(' · ') };
}

function riskAgent(input: InstrumentPrecisionInput): InstrumentAgentResult {
  let status: InstrumentAgentStatus = 'OK';
  const reasons: string[] = [];
  // Risk-Veto laeuft hier ueber den Safety-Scan-Score. Wenn der unter
  // 60 ist und alle Detail-Kriterien zaehlen, ist die Risiko-Lage zu
  // unsauber fuer eine Freigabe.
  if (input.safety.score < 60) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Safety-Score ${input.safety.score}/100 zu schwach`);
  } else if (input.safety.score < 75) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`Safety-Score ${input.safety.score}/100 grenzwertig`);
  }
  if (reasons.length === 0) reasons.push('Safety-Score solide.');
  return { id: 'risk', label: 'Risiko-Veto', status, reason: reasons.join(' · ') };
}

function calibrationAgent(input: InstrumentPrecisionInput): InstrumentAgentResult {
  let status: InstrumentAgentStatus = 'OK';
  const reasons: string[] = [];
  if (typeof input.backtestSampleSize === 'number' && input.backtestSampleSize < 10) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`Backtest-Historie ${input.backtestSampleSize}`);
  }
  if (typeof input.backtestHitRatePct === 'number' && (input.backtestSampleSize ?? 0) >= 10) {
    if (input.backtestHitRatePct < 45) {
      status = escalate(status, 'BLOCKIERT');
      reasons.push(`Backtest-Hit ${input.backtestHitRatePct} %`);
    } else if (input.backtestHitRatePct < 55) {
      status = escalate(status, 'WARNUNG');
      reasons.push(`Backtest-Hit ${input.backtestHitRatePct} %`);
    }
  }
  if (reasons.length === 0) reasons.push('Keine Kalibrierungs-Bedenken.');
  return { id: 'calibration', label: 'Kalibrierungswaechter', status, reason: reasons.join(' · ') };
}

export function evaluateInstrumentPrecisionPick(input: InstrumentPrecisionInput): InstrumentPrecisionResult {
  const agents = [dataAgent(input), modelAgent(input), riskAgent(input), calibrationAgent(input)];
  const blockers: string[] = [];
  const warnings: string[] = [];
  for (const c of input.safety.criteria) {
    if (!c.passed) blockers.push(`${c.label}: ${c.detail}`);
  }
  for (const a of agents) {
    if (a.status === 'BLOCKIERT') blockers.push(`${a.label}: ${a.reason}`);
    else if (a.status === 'WARNUNG') warnings.push(`${a.label}: ${a.reason}`);
  }

  let verdict: InstrumentPrecisionVerdict;
  if (blockers.length > 0) {
    verdict = 'NICHT_VERWENDEN';
  } else if (input.safety.maxSafety && input.safety.grade === 'A' && warnings.length === 0) {
    verdict = 'FREIGABE';
  } else {
    verdict = 'BEOBACHTEN';
  }

  const reasons: string[] = [];
  if (verdict === 'FREIGABE') {
    reasons.push(`Alle ${input.safety.totalHard} Safety-Kriterien erfuellt, Grade A.`);
    if (typeof input.marketTrendPct === 'number') reasons.push(`Marktbreite ${input.marketTrendPct.toFixed(1)} %.`);
    if (input.backtestHitRatePct !== null && input.backtestHitRatePct !== undefined) reasons.push(`Backtest-Hit ${input.backtestHitRatePct} %.`);
  } else if (verdict === 'BEOBACHTEN') {
    reasons.push(...warnings.slice(0, 3));
    if (reasons.length === 0) reasons.push(`Grade ${input.safety.grade}, ${input.safety.passedHard}/${input.safety.totalHard} Kriterien.`);
  } else {
    reasons.push(...blockers.slice(0, 3));
  }

  const riskLabel: InstrumentPrecisionResult['riskLabel'] = blockers.length > 0 ? 'HIGH'
    : warnings.length > 0 ? 'MEDIUM' : 'LOW';

  return {
    symbol: input.symbol,
    name: input.name,
    group: input.group,
    kind: input.kind,
    verdict,
    precisionScore: input.safety.score,
    reasons,
    blockers,
    warnings,
    agentStatuses: agents,
    shouldShowAsTopPick: verdict !== 'NICHT_VERWENDEN',
    riskLabel
  };
}
