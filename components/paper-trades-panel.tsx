'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CandleLite,
  PaperTrade,
  TRADES_CHANGED_EVENT,
  closeTradeManual,
  computeStats,
  deleteTrade,
  evaluateTrade,
  loadTrades,
  saveTrades
} from '@/lib/paper-trading';

function fmtMoney(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}${symbol}${abs.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${sign}${symbol}${abs.toFixed(2)}`;
}

function fmtMoneyPlain(value: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (Math.abs(value) >= 1000) return `${symbol}${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  return `${symbol}${value.toFixed(2)}`;
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function fmtAge(takenAt: number): string {
  const ms = Date.now() - takenAt;
  const h = Math.floor(ms / (60 * 60 * 1000));
  if (h < 1) return `${Math.floor(ms / 60000)}m`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function statusBadge(status: PaperTrade['status']): { label: string; classes: string } {
  switch (status) {
    case 'open':
      return { label: 'OPEN', classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300' };
    case 'closed_tp1':
      return { label: 'TP1 ✓', classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' };
    case 'closed_tp2':
      return { label: 'TP2 ✓', classes: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' };
    case 'closed_sl':
      return { label: 'SL ✗', classes: 'border-rose-500/40 bg-rose-500/10 text-rose-300' };
    case 'closed_manual':
      return { label: 'MANUELL', classes: 'border-slate-500/40 bg-slate-500/10 text-slate-300' };
  }
}

function OpenTradeRow({ trade, latestPrice, onClose, onDelete }: {
  trade: PaperTrade;
  latestPrice: number | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const badge = statusBadge('open');
  const unrealizedPnlQuote = latestPrice !== null ? (latestPrice - trade.entry) * trade.positionSizeCoins : null;
  const unrealizedPnlPct = latestPrice !== null ? ((latestPrice - trade.entry) / trade.entry) * 100 : null;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{trade.ticker}/USDT</span>
          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.classes}`}>{badge.label}</span>
          <span className="font-mono text-[10px] text-slate-500">{fmtAge(trade.takenAt)}</span>
        </div>
        <div className="text-right">
          {unrealizedPnlQuote !== null && unrealizedPnlPct !== null ? (
            <>
              <div className={`font-mono text-sm font-bold ${unrealizedPnlQuote >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmtMoney(unrealizedPnlQuote, trade.currency)}
              </div>
              <div className={`font-mono text-[10px] ${unrealizedPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmtPct(unrealizedPnlPct)} unrealized
              </div>
            </>
          ) : (
            <div className="font-mono text-[10px] text-slate-500">live PnL nicht verfügbar</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[11px]">
        <div>
          <div className="text-slate-500">Entry</div>
          <div className="font-mono text-white">${fmtPrice(trade.entry)}</div>
        </div>
        <div>
          <div className="text-slate-500">Aktuell</div>
          <div className="font-mono text-slate-100">{latestPrice !== null ? `$${fmtPrice(latestPrice)}` : '—'}</div>
        </div>
        <div>
          <div className="text-rose-400">SL</div>
          <div className="font-mono text-rose-200">${fmtPrice(trade.stopLoss)}</div>
        </div>
        <div>
          <div className="text-emerald-400">TP1</div>
          <div className="font-mono text-emerald-200">${fmtPrice(trade.takeProfit1)}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-800 pt-2 text-[10px] text-slate-500">
        <span className="font-mono">
          {trade.positionSizeCoins.toFixed(5)} {trade.ticker} · {fmtMoneyPlain(trade.investmentQuote, trade.currency)} eingesetzt
        </span>
        <div className="flex gap-1">
          {latestPrice !== null && (
            <button
              onClick={onClose}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/40 hover:text-amber-200"
            >
              Manuell schließen
            </button>
          )}
          <button
            onClick={onDelete}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500 hover:border-rose-500/40 hover:text-rose-300"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function ClosedTradeRow({ trade, onDelete }: { trade: PaperTrade; onDelete: () => void }) {
  const badge = statusBadge(trade.status);
  const pnl = trade.realizedPnlQuote ?? 0;
  const pnlPct = trade.realizedPnlPct ?? 0;
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-[11px]">
      <div className="col-span-3 flex items-center gap-2">
        <span className="font-mono text-sm font-bold text-slate-100">{trade.ticker}</span>
        <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.classes}`}>{badge.label}</span>
      </div>
      <div className="col-span-3 font-mono text-slate-500">
        ${fmtPrice(trade.entry)} <span className="text-slate-700">→</span> ${trade.closePrice !== undefined ? fmtPrice(trade.closePrice) : '—'}
      </div>
      <div className={`col-span-3 font-mono font-semibold ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
        {fmtMoney(pnl, trade.currency)} <span className="font-normal text-slate-500">({fmtPct(pnlPct)})</span>
      </div>
      <div className="col-span-2 font-mono text-slate-500">{fmtAge(trade.takenAt)}</div>
      <div className="col-span-1 text-right">
        <button
          onClick={onDelete}
          className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-rose-500/40 hover:text-rose-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function PaperTradesPanel({ latestPrices }: { latestPrices: Record<string, number | null> }) {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [mounted, setMounted] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const refresh = useCallback(() => setTrades(loadTrades()), []);

  useEffect(() => {
    refresh();
    setMounted(true);
    window.addEventListener(TRADES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TRADES_CHANGED_EVENT, refresh);
  }, [refresh]);

  const handleEvaluate = useCallback(async () => {
    const current = loadTrades();
    const openByAsset = new Map<string, { earliestTakenAt: number; trades: PaperTrade[] }>();
    for (const t of current.filter((t) => t.status === 'open')) {
      const entry = openByAsset.get(t.assetId);
      if (!entry) {
        openByAsset.set(t.assetId, { earliestTakenAt: t.takenAt, trades: [t] });
      } else {
        entry.trades.push(t);
        entry.earliestTakenAt = Math.min(entry.earliestTakenAt, t.takenAt);
      }
    }
    if (openByAsset.size === 0) return;
    setEvaluating(true);
    try {
      const candleByAsset: Record<string, CandleLite[]> = {};
      await Promise.all(
        Array.from(openByAsset.entries()).map(async ([assetId, info]) => {
          const res = await fetch(`/api/candles/since?assetId=${assetId}&since=${info.earliestTakenAt}`, { cache: 'no-store' });
          if (!res.ok) return;
          const data = await res.json();
          if (data?.ok && Array.isArray(data.candles)) candleByAsset[assetId] = data.candles;
        })
      );
      const next = current.map((t) => {
        if (t.status !== 'open') return t;
        const candles = candleByAsset[t.assetId];
        if (!candles) return t;
        return evaluateTrade(t, candles);
      });
      const anyChanged = next.some((t, i) => t.status !== current[i].status);
      if (anyChanged) saveTrades(next);
    } finally {
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) handleEvaluate();
  }, [mounted, handleEvaluate]);

  if (!mounted) return null;

  if (trades.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paper Trading</h3>
        <p className="mt-2 text-sm text-slate-500">
          Noch keine Paper-Trades. Klick auf <span className="font-semibold text-emerald-300">{`„Signal nehmen"`}</span> bei einem aktiven Signal, um virtuell zu öffnen.
          Wir tracken Entry, SL, TP1 und realized PnL — ohne dass du echtes Geld einsetzt.
        </p>
      </section>
    );
  }

  const stats = computeStats(trades, Object.fromEntries(
    Object.entries(latestPrices).filter(([, v]) => typeof v === 'number')
  ) as Record<string, number>);
  const openTrades = trades.filter((t) => t.status === 'open').sort((a, b) => b.takenAt - a.takenAt);
  const closedTrades = trades.filter((t) => t.status !== 'open').sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));

  const winRateText = stats.winRate !== null ? `${(stats.winRate * 100).toFixed(0)}%` : '—';
  const winRateColor = stats.winRate !== null && stats.winRate >= 0.5 ? 'text-emerald-300' : 'text-amber-300';

  const currencies = Array.from(new Set(trades.map((t) => t.currency)));

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 to-slate-900/40 p-5">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paper Trading</h3>
          <p className="mt-1 text-[11px] text-slate-500">Lokal in deinem Browser. Server-side Auto-Check auf SL/TP bei jedem Page-Load.</p>
        </div>
        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
        >
          {evaluating ? 'Prüfe…' : 'Re-check'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-slate-800 py-4 md:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white">{stats.total}</div>
          <div className="font-mono text-[10px] text-slate-500">{stats.open} offen · {stats.closed} zu</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Win-Rate</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${winRateColor}`}>{winRateText}</div>
          <div className="font-mono text-[10px] text-slate-500">{stats.wins}W / {stats.losses}L</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Realized PnL</div>
          <div className="mt-1 space-y-0.5">
            {currencies.length === 0 ? <div className="font-mono text-2xl font-bold text-slate-500">—</div> : currencies.map((c) => {
              const v = stats.realizedPnlByCurrency[c] ?? 0;
              return (
                <div key={c} className={`font-mono text-xl font-bold ${v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {fmtMoney(v, c)}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Unrealized</div>
          <div className="mt-1 space-y-0.5">
            {currencies.length === 0 ? <div className="font-mono text-2xl font-bold text-slate-500">—</div> : currencies.map((c) => {
              const v = stats.unrealizedPnlByCurrency[c] ?? 0;
              return (
                <div key={c} className={`font-mono text-xl font-bold ${v >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {fmtMoney(v, c)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {openTrades.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Offene Trades ({openTrades.length})</h4>
          {openTrades.map((t) => (
            <OpenTradeRow
              key={t.id}
              trade={t}
              latestPrice={latestPrices[t.assetId] ?? null}
              onClose={() => {
                const price = latestPrices[t.assetId];
                if (typeof price === 'number') {
                  closeTradeManual(t.id, price);
                }
              }}
              onDelete={() => { if (window.confirm('Paper-Trade löschen?')) deleteTrade(t.id); }}
            />
          ))}
        </div>
      )}

      {closedTrades.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Geschlossene Trades ({closedTrades.length})</h4>
          {closedTrades.map((t) => (
            <ClosedTradeRow key={t.id} trade={t} onDelete={() => { if (window.confirm('Paper-Trade löschen?')) deleteTrade(t.id); }} />
          ))}
        </div>
      )}
    </section>
  );
}
