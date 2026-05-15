'use client';

import { useEffect, useState } from 'react';
import { AccountConfig, DEFAULT_CONFIG, computeSizing, loadConfig } from '@/lib/account-config';
import { TradeSignal } from '@/lib/types/domain';

function formatMoney(value: number, currency: 'EUR' | 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (Math.abs(value) >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(2)}`;
}

function formatCoins(value: number): string {
  if (value >= 1) return value.toFixed(3);
  if (value >= 0.001) return value.toFixed(5);
  return value.toFixed(7);
}

export function SignalSizing({ signal }: { signal: TradeSignal }) {
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => setConfig(loadConfig());
    refresh();
    setMounted(true);
    window.addEventListener('trading-app:config-changed', refresh);
    return () => window.removeEventListener('trading-app:config-changed', refresh);
  }, []);

  if (!mounted) return null;

  const sizing = computeSizing(config, signal.entry, signal.stopLoss, signal.takeProfit1, signal.takeProfit2);
  if (!sizing) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
        Trading-Kapital oben konfigurieren, um Positionsgröße zu sehen.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/20 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
          Position bei {formatMoney(config.accountSize, config.currency)} · {config.maxRiskPct}%
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          {sizing.asPctOfAccount.toFixed(1)}% des Kapitals
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Menge</div>
          <div className="mt-0.5 font-mono font-bold text-white">{formatCoins(sizing.positionSizeCoins)}</div>
          <div className="font-mono text-[10px] text-slate-500">{signal.ticker}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Einsatz</div>
          <div className="mt-0.5 font-mono font-bold text-white">{formatMoney(sizing.positionSizeQuote, config.currency)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-rose-400">Risk</div>
          <div className="mt-0.5 font-mono font-bold text-rose-300">−{formatMoney(sizing.riskAmount, config.currency)}</div>
          <div className="font-mono text-[10px] text-rose-400">bei SL</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400">Gewinn</div>
          <div className="mt-0.5 font-mono font-bold text-emerald-300">+{formatMoney(sizing.reward1Amount, config.currency)}</div>
          <div className="font-mono text-[10px] text-emerald-400">bei TP1</div>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>Bei TP2: <span className="text-emerald-300">+{formatMoney(sizing.reward2Amount, config.currency)}</span></span>
        <span className="text-slate-600">Tip: nicht alles auf TP2 setzen — 50% bei TP1 schließen, Rest mit SL auf Entry trailen</span>
      </div>
    </div>
  );
}
