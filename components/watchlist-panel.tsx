'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { WATCHLIST_CHANGED_EVENT, WatchlistItem, loadWatchlist, removeFromWatchlist, setWatchNote, toggleWatch } from '@/lib/watchlist';
import { TOP_50 } from '@/lib/coin-universe';
import { EmptyState } from '@/components/empty-state';

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(7);
}
function pctColor(v: number): string {
  if (v > 0) return 'text-emerald-300';
  if (v < 0) return 'text-rose-300';
  return 'text-slate-300';
}

export function WatchlistPanel({ prices, changes }: { prices: Record<string, number | null>; changes: Record<string, number | null> }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(() => setItems(loadWatchlist()), []);
  useEffect(() => {
    refresh();
    setMounted(true);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WATCHLIST_CHANGED_EVENT, refresh);
  }, [refresh]);

  if (!mounted) return null;

  const watchedIds = new Set(items.map((i) => i.coinId));
  const available = TOP_50.filter((c) => !watchedIds.has(c.id));

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Watchlist</h2>
          <p className="mt-1 text-[11px] text-slate-500">Deine beobachteten Coins mit Live-Kurs. Tippen öffnet den Chart.</p>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
          {adding ? '× Schließen' : '+ Coin'}
        </button>
      </div>

      {adding && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          {available.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleWatch(c.id, c.symbol)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200"
            >
              + {c.symbol}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && !adding && (
        <EmptyState
          title="Noch keine Coins beobachtet"
          description="Sammle Coins, die du im Blick behalten willst — mit Notiz, warum sie interessant sind. So trennst du Beobachtung von echten Positionen."
          steps={[
            'Coin hinzufügen und optional eine kurze These notieren.',
            'Kursentwicklung im Auge behalten, ohne Kapital zu binden.',
            'Bei gutem Setup direkt zur Idee-Analyse oder Position übergehen.'
          ]}
          actionLabel="Coin hinzufügen"
          onAction={() => setAdding(true)}
        />
      )}

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((w) => {
            const price = prices[w.coinId];
            const change = changes[w.coinId];
            return (
              <div key={w.coinId} className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2">
                <Link href={`/assets/${w.symbol.toLowerCase()}`} className="w-16 font-mono text-sm font-bold text-slate-100 hover:text-emerald-300">{w.symbol}</Link>
                <div className="font-mono text-sm text-white">{price !== null && price !== undefined ? `$${fmtPrice(price)}` : '—'}</div>
                <div className={`font-mono text-xs ${change !== null && change !== undefined ? pctColor(change) : 'text-slate-500'}`}>
                  {change !== null && change !== undefined ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : ''}
                </div>
                <input
                  defaultValue={w.note ?? ''}
                  onBlur={(e) => setWatchNote(w.coinId, e.target.value)}
                  placeholder="Notiz…"
                  className="ml-auto w-28 rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300 focus:border-emerald-500/40 focus:outline-none"
                />
                <button onClick={() => removeFromWatchlist(w.coinId)} className="text-slate-600 hover:text-rose-300">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
