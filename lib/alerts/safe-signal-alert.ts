import { buildMasterSignal } from '@/lib/analysis/master-signal-engine';
import { getBacktestSummary } from '@/lib/analysis/backtest-summary';
import { evaluateSafety } from '@/lib/analysis/safety-gate';
import { getTelegramConfig, sendTelegramMessage, escapeHtml } from '@/lib/telegram';

function fmtUsd(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

export interface SafeSignalResult {
  configured: boolean;
  hasSafeSignal: boolean;
  coin: string | null;
  grade: string | null;
  alertSent: boolean;
  error?: string;
}

// Evaluates the strict safety gate on the best current setup and, only when it
// reaches grade A (all hard criteria pass), pushes a Telegram alert. Designed to
// be called by a once-daily cron so it never spams.
export async function checkSafeSignalAndAlert(): Promise<SafeSignalResult> {
  const config = getTelegramConfig();
  const [report, backtest] = await Promise.all([buildMasterSignal('swing'), getBacktestSummary()]);
  const target = report.candidates[0];

  if (!target) {
    return { configured: config !== null, hasSafeSignal: false, coin: null, grade: null, alertSent: false };
  }

  const safety = evaluateSafety({
    passedCount: target.passedCount,
    marketMood: report.marketMood,
    btcRegime: report.btcRegime,
    isBtc: target.coinId === 'btc',
    structure: target.structure,
    nearSupport: target.nearSupport,
    crowdCautious: report.crowd.cautious,
    quoteVolume: target.quoteVolume,
    stopDistancePct: target.stopDistancePct,
    confirmed: target.confirmed,
    backtestEdge: backtest.perAssetEdge[target.coinId] ?? null
  });

  if (!safety.maxSafety) {
    return { configured: config !== null, hasSafeSignal: false, coin: target.symbol, grade: safety.grade, alertSent: false };
  }

  if (!config) {
    return { configured: false, hasSafeSignal: true, coin: target.symbol, grade: safety.grade, alertSent: false };
  }

  const lines: string[] = [
    `<b>🟢 SICHERES SIGNAL — ${escapeHtml(target.symbol)}</b>`,
    `<i>Höchste Sicherheitsstufe (Note A) — alle Kriterien erfüllt.</i>`,
    '',
    `<b>Kaufen</b> zum Marktpreis ~<code>${fmtUsd(target.entry)}</code>`,
    `<b>Stop-Loss:</b> <code>${fmtUsd(target.stopLoss)}</code> (−${target.stopDistancePct.toFixed(1)}%)`,
    `<b>Ziel 1:</b> <code>${fmtUsd(target.takeProfit1)}</code>`,
    `<b>Konfluenz:</b> ${target.passedCount}/12 · <b>Sicherheits-Score:</b> ${safety.score}/100`,
    '',
    `<i>${escapeHtml(safety.residualRiskNote)}</i>`,
    '<i>Keine Finanzberatung.</i>'
  ];

  const res = await sendTelegramMessage(lines.join('\n'), config);
  return {
    configured: true,
    hasSafeSignal: true,
    coin: target.symbol,
    grade: safety.grade,
    alertSent: res.ok,
    error: res.ok ? undefined : res.error
  };
}
