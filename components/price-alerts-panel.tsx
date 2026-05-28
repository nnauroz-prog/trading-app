'use client';

import { useCallback, useEffect, useState } from 'react';
import { ALERTS_CHANGED_EVENT, AlertDirection, PriceAlert, addAlert, deleteAlert, evaluateAlerts, loadAlerts, resetAlert } from '@/lib/price-alerts';
import { TOP_50 } from '@/lib/coin-universe';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}

export function PriceAlertsPanel({ prices }: { prices: Record<string, number | null> }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [coinId, setCoinId] = useState('btc');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [target, setTarget] = useState('');

  const refresh = useCallback(() => setAlerts(loadAlerts()), []);

  useEffect(() => {
    refresh();
    setMounted(true);
    window.addEventListener(ALERTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    if (!mounted) return;
    const fired = evaluateAlerts(prices);
    if (fired.length > 0) {
      refresh();
      // Best-effort Telegram-Push (no-op if not configured server-side)
      for (const a of fired) {
        fetch('/api/notify-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: a.symbol,
            direction: a.direction,
            targetPrice: a.targetPrice,
            currentPrice: prices[a.coinId] ?? undefined
          })
        }).catch(() => {});
      }
    }
  }, [mounted, prices, refresh]);

  if (!mounted) return null;

  const handleAdd = () => {
    const t = parseFloat(target);
    if (!Number.isFinite(t) || t <= 0) return;
    const coin = TOP_50.find((c) => c.id === coinId);
    if (!coin) return;
    addAlert(coinId, coin.symbol, direction, t);
    setTarget('');
    setAdding(false);
  };

  const active = alerts.filter((a) => !a.triggered);
  const triggered = alerts.filter((a) => a.triggered);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kurs-Alerts</h2>
          <p className="mt-1 text-[11px] text-slate-500">Kursziele setzen — beim Öffnen der App gegen Live-Kurse geprüft, markiert wenn erreicht. Bei gesetztem Telegram-Bot zusätzlich Push aufs Handy (nur während App offen — echtes Background-Polling braucht Supabase + Cron).</p>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
          {adding ? '× Schließen' : '+ Alert'}
        </button>
      </div>

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <label className="text-xs">
            <span className="text-slate-400">Coin</span>
            <select value={coinId} onChange={(e) => setCoinId(e.target.value)} className="mt-1 block w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
              {TOP_50.map((c) => <option key={c.id} value={c.id}>{c.symbol}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-slate-400">Richtung</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as AlertDirection)} className="mt-1 block w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white">
              <option value="above">steigt über</option>
              <option value="below">fällt unter</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="text-slate-400">Zielkurs ($)</span>
            <input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={prices[coinId] ? fmtPrice(prices[coinId]!) : '100'} className="mt-1 block w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white" />
          </label>
          <button onClick={handleAdd} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">Setzen</button>
        </div>
      )}

      {alerts.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-500">
          Keine Alerts. <button onClick={() => setAdding(true)} className="text-emerald-300 underline">Ersten Kurs-Alert setzen</button>
        </div>
      )}

      {triggered.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">🔔 Ausgelöst ({triggered.length})</div>
          {triggered.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 text-xs">
              <span className="font-mono text-sm font-bold text-emerald-200">{a.symbol}</span>
              <span className="text-slate-300">{a.direction === 'above' ? 'über' : 'unter'} ${fmtPrice(a.targetPrice)} erreicht</span>
              <span className="font-mono text-[10px] text-slate-500">aktuell ${prices[a.coinId] ? fmtPrice(prices[a.coinId]!) : '—'}</span>
              <button onClick={() => resetAlert(a.id)} className="ml-auto rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:text-emerald-200">reset</button>
              <button onClick={() => deleteAlert(a.id)} className="text-slate-600 hover:text-rose-300">✕</button>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Aktiv ({active.length})</div>
          {active.map((a) => {
            const price = prices[a.coinId];
            const dist = typeof price === 'number' ? ((a.targetPrice - price) / price) * 100 : null;
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs">
                <span className="font-mono text-sm font-bold text-slate-100">{a.symbol}</span>
                <span className="text-slate-400">{a.direction === 'above' ? '↗ über' : '↘ unter'} <span className="font-mono text-slate-200">${fmtPrice(a.targetPrice)}</span></span>
                <span className="font-mono text-[10px] text-slate-500">jetzt ${price ? fmtPrice(price) : '—'}{dist !== null ? ` · ${dist > 0 ? '+' : ''}${dist.toFixed(1)}% entfernt` : ''}</span>
                <button onClick={() => deleteAlert(a.id)} className="ml-auto text-slate-600 hover:text-rose-300">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
