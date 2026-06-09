// Krypto Precision Desk — Mapping-Gate.
//
// Im Krypto-Bereich existiert bereits ein hartes Safety-Gate
// (lib/analysis/safety-gate.ts) mit grade A/B/C/D + maxSafety-Flag. Diese
// Pure-Lib mapped das bestehende SafetyAssessment + Markt-Kontext auf die
// drei finalen Precision-Zustaende FREIGABE | BEOBACHTEN | NICHT_VERWENDEN
// und liefert daneben 4 echte Pruefmodule (Daten/Modell/Risiko/
// Kalibrierungswaechter).
//
// Reine Funktion, keine I/O. Wording strikt ohne verbotene Begriffe.

import type { SafetyAssessment } from '@/lib/analysis/safety-gate';

export type CryptoPrecisionVerdict = 'FREIGABE' | 'BEOBACHTEN' | 'NICHT_VERWENDEN';
export type CryptoAgentStatus = 'OK' | 'WARNUNG' | 'BLOCKIERT';

export interface CryptoAgentResult {
  id: 'data' | 'model' | 'risk' | 'calibration';
  label: string;
  status: CryptoAgentStatus;
  reason: string;
}

export interface CryptoPrecisionInput {
  coinId: string;
  symbol: string;
  passedCount: number;
  totalCount: number;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  btcRegime: 'bull' | 'bear' | 'sideways';
  structure: 'uptrend' | 'downtrend' | 'range' | 'breakout' | 'breakdown' | 'unknown' | string;
  nearSupport: boolean;
  quoteVolume: number;
  stopDistancePct: number;
  priceChangePct24h: number;
  crowdCautious: boolean;
  confirmed: boolean;
  backtestWinRatePct: number | null;
  backtestSampleSize: number;
  safety: SafetyAssessment;
}

export interface CryptoPrecisionResult {
  coinId: string;
  symbol: string;
  verdict: CryptoPrecisionVerdict;
  precisionScore: number;          // 0..100
  reasons: string[];
  blockers: string[];
  warnings: string[];
  agentStatuses: CryptoAgentResult[];
  // True wenn der Pick in der Top-Liste angezeigt werden darf.
  shouldShowAsTopPick: boolean;
  // Klartext-Risiko-Label fuer die UI.
  riskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Schwellen — zentral, damit Tests und UI dasselbe Bild ziehen.
export const CRYPTO_PRECISION_THRESHOLDS = {
  passedCountMin: 7,
  passedCountFreigabe: 9,
  stopDistanceMax: 6,
  stopDistanceMin: 1,
  quoteVolumeMin: 50_000_000,
  priceChangeMax: 15,
  backtestSampleForCalibration: 10
};

// Ersetzt Legacy-Sprache aus anderen Modulen durch neutrale Modell-Begriffe.
// So wirken sich „sicher"-Strings aus safety-gate criteria nicht auf das
// Precision-Wording aus.
function sanitize(text: string): string {
  return text
    .replace(/Maximal sicher/gi, 'Hoechste Konfluenz')
    .replace(/sehr sicher/gi, 'starke Konfluenz')
    .replace(/sicherer Tipp/gi, 'Modell-Freigabe')
    .replace(/„sicher"/gi, 'Freigabe')
    .replace(/„sicher“/gi, 'Freigabe')
    .replace(/\bsicher\b/gi, 'Freigabe-faehig')
    .replace(/\bBank\b/g, 'Modell-Pick')
    .replace(/garantiert/gi, 'belegt')
    .replace(/todsicher/gi, 'Modell-stark')
    .replace(/risikolos/gi, 'risiko-arm');
}

function escalate(current: CryptoAgentStatus, next: CryptoAgentStatus): CryptoAgentStatus {
  const rank: Record<CryptoAgentStatus, number> = { OK: 0, WARNUNG: 1, BLOCKIERT: 2 };
  return rank[next] > rank[current] ? next : current;
}

export function evaluateCryptoDataAgent(input: CryptoPrecisionInput): CryptoAgentResult {
  let status: CryptoAgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.passedCount < CRYPTO_PRECISION_THRESHOLDS.passedCountMin) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Konfluenz ${input.passedCount}/${input.totalCount}`);
  } else if (input.passedCount < CRYPTO_PRECISION_THRESHOLDS.passedCountFreigabe) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`Konfluenz ${input.passedCount}/${input.totalCount} (unter Freigabe-Schwelle)`);
  }
  if (input.quoteVolume < CRYPTO_PRECISION_THRESHOLDS.quoteVolumeMin) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Liquiditaet ${Math.round(input.quoteVolume / 1_000_000)} M$`);
  }
  if (!input.confirmed) {
    status = escalate(status, 'WARNUNG');
    reasons.push('Setup noch nicht bestaetigt');
  }
  if (reasons.length === 0) reasons.push('Konfluenz und Liquiditaet ueber Schwelle.');
  return { id: 'data', label: 'Datenpruefer', status, reason: reasons.join(' · ') };
}

export function evaluateCryptoModelAgent(input: CryptoPrecisionInput): CryptoAgentResult {
  let status: CryptoAgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.marketMood === 'risk-off') {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('Markt-Mood risk-off');
  }
  if (input.btcRegime === 'bear' && input.coinId !== 'btc') {
    status = escalate(status, 'BLOCKIERT');
    reasons.push('BTC-Regime baerisch');
  }
  if (input.structure !== 'uptrend' && input.structure !== 'breakout') {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Struktur ${input.structure}`);
  }
  if (input.crowdCautious) {
    status = escalate(status, 'WARNUNG');
    reasons.push('Crowd-Stimmung vorsichtig');
  }
  if (reasons.length === 0) reasons.push('Markt-Regime, Struktur und Stimmung konfluent.');
  return { id: 'model', label: 'Modellpruefer', status, reason: reasons.join(' · ') };
}

export function evaluateCryptoRiskAgent(input: CryptoPrecisionInput): CryptoAgentResult {
  let status: CryptoAgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.stopDistancePct < CRYPTO_PRECISION_THRESHOLDS.stopDistanceMin) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Stop ${input.stopDistancePct.toFixed(1)} % zu eng`);
  } else if (input.stopDistancePct > CRYPTO_PRECISION_THRESHOLDS.stopDistanceMax) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`Stop ${input.stopDistancePct.toFixed(1)} % zu weit`);
  }
  if (Math.abs(input.priceChangePct24h) > CRYPTO_PRECISION_THRESHOLDS.priceChangeMax) {
    status = escalate(status, 'BLOCKIERT');
    reasons.push(`24h-Bewegung ${input.priceChangePct24h.toFixed(1)} % (Chase-Risiko)`);
  } else if (Math.abs(input.priceChangePct24h) > 8) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`24h ${input.priceChangePct24h.toFixed(1)} %`);
  }
  if (!input.nearSupport) {
    status = escalate(status, 'WARNUNG');
    reasons.push('nicht in der Naehe einer Unterstuetzung');
  }
  if (reasons.length === 0) reasons.push('Stop-Band, Volatilitaet und Unterstuetzung in Ordnung.');
  return { id: 'risk', label: 'Risiko-Veto', status, reason: reasons.join(' · ') };
}

export function evaluateCryptoCalibrationAgent(input: CryptoPrecisionInput): CryptoAgentResult {
  let status: CryptoAgentStatus = 'OK';
  const reasons: string[] = [];
  if (input.backtestSampleSize < CRYPTO_PRECISION_THRESHOLDS.backtestSampleForCalibration) {
    status = escalate(status, 'WARNUNG');
    reasons.push(`Backtest-Stichprobe ${input.backtestSampleSize}`);
  }
  if (input.backtestWinRatePct !== null && input.backtestSampleSize >= 10) {
    if (input.backtestWinRatePct < 45) {
      status = escalate(status, 'BLOCKIERT');
      reasons.push(`Backtest-Hit ${input.backtestWinRatePct} %`);
    } else if (input.backtestWinRatePct < 50) {
      status = escalate(status, 'WARNUNG');
      reasons.push(`Backtest-Hit ${input.backtestWinRatePct} %`);
    }
  }
  if (reasons.length === 0) reasons.push('Backtest stuetzt das Setup.');
  return { id: 'calibration', label: 'Kalibrierungswaechter', status, reason: reasons.join(' · ') };
}

export function evaluateCryptoAgents(input: CryptoPrecisionInput): CryptoAgentResult[] {
  return [
    evaluateCryptoDataAgent(input),
    evaluateCryptoModelAgent(input),
    evaluateCryptoRiskAgent(input),
    evaluateCryptoCalibrationAgent(input)
  ];
}

function precisionScore(input: CryptoPrecisionInput): number {
  // 5 Faktoren: Konfluenz (30) + Safety (30) + Liquiditaet (15) + Struktur (15)
  // + Markt (10). Maximal 100.
  const confluencePart = Math.max(0, Math.min(30, (input.passedCount / Math.max(1, input.totalCount)) * 30));
  const safetyPart = Math.max(0, Math.min(30, (input.safety.score / 100) * 30));
  const liquidityPart = input.quoteVolume >= 200_000_000 ? 15
    : input.quoteVolume >= CRYPTO_PRECISION_THRESHOLDS.quoteVolumeMin ? 10
    : input.quoteVolume >= 20_000_000 ? 5 : 0;
  const structurePart = input.structure === 'uptrend' ? 15
    : input.structure === 'breakout' ? 12
    : input.structure === 'range' ? 6
    : 0;
  const marketPart = input.marketMood === 'risk-on' ? 10
    : input.marketMood === 'neutral' ? 6 : 0;
  return Math.round(confluencePart + safetyPart + liquidityPart + structurePart + marketPart);
}

export function evaluateCryptoPrecisionPick(input: CryptoPrecisionInput): CryptoPrecisionResult {
  const agents = evaluateCryptoAgents(input);
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Aus dem existierenden Safety-Gate uebernehmen wir die harten Kriterien
  // als Blocker-Quelle. Wording wird gefiltert, damit alte „sicher"-Begriffe
  // aus der safety-gate-Lib hier nicht durchschlagen.
  for (const c of input.safety.criteria) {
    if (!c.passed) blockers.push(sanitize(`${c.label}: ${c.detail}`));
  }
  for (const a of agents) {
    if (a.status === 'BLOCKIERT') blockers.push(`${a.label}: ${a.reason}`);
    else if (a.status === 'WARNUNG') warnings.push(`${a.label}: ${a.reason}`);
  }

  let verdict: CryptoPrecisionVerdict;
  if (blockers.length > 0) {
    verdict = 'NICHT_VERWENDEN';
  } else if (input.safety.maxSafety && input.passedCount >= CRYPTO_PRECISION_THRESHOLDS.passedCountFreigabe && warnings.length === 0) {
    verdict = 'FREIGABE';
  } else {
    verdict = 'BEOBACHTEN';
  }

  const reasons: string[] = [];
  if (verdict === 'FREIGABE') {
    reasons.push(`Alle ${input.safety.totalHard} harten Safety-Kriterien erfuellt, Konfluenz ${input.passedCount}/${input.totalCount}.`);
    reasons.push(`Struktur ${input.structure}, Markt-Mood ${input.marketMood}.`);
    if (input.backtestWinRatePct !== null && input.backtestSampleSize >= 10) reasons.push(`Backtest-Hit ${input.backtestWinRatePct} % (n=${input.backtestSampleSize}).`);
  } else if (verdict === 'BEOBACHTEN') {
    reasons.push(...warnings.slice(0, 3));
    if (reasons.length === 0) reasons.push(`Konfluenz ${input.passedCount}/${input.totalCount} unter Freigabe-Schwelle ${CRYPTO_PRECISION_THRESHOLDS.passedCountFreigabe}.`);
  } else {
    reasons.push(...blockers.slice(0, 3));
  }

  const score = precisionScore(input);
  const riskLabel: CryptoPrecisionResult['riskLabel'] = blockers.length > 0 ? 'HIGH'
    : warnings.length > 0 ? 'MEDIUM' : 'LOW';

  return {
    coinId: input.coinId,
    symbol: input.symbol,
    verdict,
    precisionScore: score,
    reasons,
    blockers,
    warnings,
    agentStatuses: agents,
    shouldShowAsTopPick: verdict !== 'NICHT_VERWENDEN',
    riskLabel
  };
}
