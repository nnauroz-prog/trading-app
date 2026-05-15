'use client';

import { useEffect, useState } from 'react';
import { TradeSignal } from '@/lib/types/domain';
import { computeSizing, loadConfig, AccountConfig, DEFAULT_CONFIG } from '@/lib/account-config';
import { addTradeFromSignal, loadTrades, TRADES_CHANGED_EVENT } from '@/lib/paper-trading';

export function TakeSignalButton({ signal }: { signal: TradeSignal }) {
  const [config, setConfig] = useState<AccountConfig>(DEFAULT_CONFIG);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justTaken, setJustTaken] = useState(false);

  useEffect(() => {
    const refreshConfig = () => setConfig(loadConfig());
    const refreshTrades = () => {
      const trades = loadTrades();
      setAlreadyTaken(
        trades.some(
          (t) =>
            t.status === 'open' &&
            t.assetId === signal.assetId &&
            Math.abs(t.entry - signal.entry) / signal.entry < 0.001
        )
      );
    };
    refreshConfig();
    refreshTrades();
    setMounted(true);
    window.addEventListener('trading-app:config-changed', refreshConfig);
    window.addEventListener(TRADES_CHANGED_EVENT, refreshTrades);
    return () => {
      window.removeEventListener('trading-app:config-changed', refreshConfig);
      window.removeEventListener(TRADES_CHANGED_EVENT, refreshTrades);
    };
  }, [signal.assetId, signal.entry]);

  if (!mounted) return null;

  const sizing = computeSizing(config, signal.entry, signal.stopLoss, signal.takeProfit1, signal.takeProfit2);

  const handleTake = () => {
    if (!sizing) return;
    addTradeFromSignal(signal, sizing.positionSizeCoins, sizing.positionSizeQuote, config.currency);
    setJustTaken(true);
    setTimeout(() => setJustTaken(false), 2500);
  };

  if (!sizing) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500"
      >
        Kapital oben konfigurieren, um Signal zu nehmen
      </button>
    );
  }

  if (alreadyTaken) {
    return (
      <button
        disabled
        className="w-full cursor-default rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300"
      >
        ✓ Bereits als Paper-Trade aktiv
      </button>
    );
  }

  return (
    <button
      onClick={handleTake}
      className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
        justTaken
          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
          : 'border-emerald-500/40 bg-emerald-600/30 text-emerald-100 hover:bg-emerald-500/40 hover:text-white'
      }`}
    >
      {justTaken ? '✓ Trade aufgenommen' : `Signal nehmen → Paper-Trade öffnen`}
    </button>
  );
}
