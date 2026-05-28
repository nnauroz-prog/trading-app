import { TradeSignal } from '@/lib/types/domain';
import { generateSignals } from '@/lib/analysis/signal-engine';
import { sendTelegramMessage, getTelegramConfig, escapeHtml } from '@/lib/telegram';

function fmtUsd(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function fmtPct(value: number, withSign = true): string {
  const sign = value > 0 && withSign ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignalMessage(signal: TradeSignal): string {
  const lines: string[] = [];
  lines.push(`<b>🚀 NEW SIGNAL — ${escapeHtml(signal.ticker)}/USDT ${signal.type}</b>`);
  lines.push('');
  lines.push(`<b>Entry:</b>  <code>${fmtUsd(signal.entry)}</code>`);
  lines.push(`<b>SL:</b>     <code>${fmtUsd(signal.stopLoss)}</code> (${fmtPct(-signal.riskPct)})`);
  lines.push(`<b>TP1:</b>    <code>${fmtUsd(signal.takeProfit1)}</code> (${fmtPct(signal.rewardPct1)})`);
  lines.push(`<b>TP2:</b>    <code>${fmtUsd(signal.takeProfit2)}</code> (${fmtPct(signal.rewardPct2)})`);
  lines.push('');
  lines.push(`<b>Confidence:</b> ${signal.confidence}%`);
  lines.push(`<b>R:R:</b> 1:${signal.riskRewardRatio.toFixed(1)} (TP1) / 1:3.0 (TP2)`);
  lines.push('');
  lines.push('<b>Reasoning:</b>');
  for (const r of signal.reasoning) {
    lines.push(`• ${escapeHtml(r)}`);
  }
  lines.push('');
  lines.push('<i>Keine Finanzberatung. Stop-Loss respektieren. Trade nur mit Geld, dessen Verlust du verkraftest.</i>');
  return lines.join('\n');
}

export interface AlertResult {
  configured: boolean;
  signalsChecked: number;
  freshSignals: number;
  alertsSent: number;
  alertsFailed: number;
  errors: string[];
  freshTickers: string[];
}

export async function checkAndAlert(): Promise<AlertResult> {
  const config = getTelegramConfig();
  const signalReport = await generateSignals();

  const fresh = signalReport.signals.filter((s) => s.indicators.macdState === 'bullish_cross');
  const result: AlertResult = {
    configured: config !== null,
    signalsChecked: signalReport.signals.length,
    freshSignals: fresh.length,
    alertsSent: 0,
    alertsFailed: 0,
    errors: [],
    freshTickers: fresh.map((s) => s.ticker)
  };

  if (!config) return result;
  if (fresh.length === 0) return result;

  for (const signal of fresh) {
    const text = formatSignalMessage(signal);
    const res = await sendTelegramMessage(text, config);
    if (res.ok) {
      result.alertsSent += 1;
    } else {
      result.alertsFailed += 1;
      if (res.error) result.errors.push(`${signal.ticker}: ${res.error}`);
    }
  }

  return result;
}
