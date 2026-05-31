'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { POSITIONS_CHANGED_EVENT, loadPositions, computePositionStats } from '@/lib/positions';

interface Props {
  latestPrices: Record<string, number | null>;
}

function asPriceMap(prices: Record<string, number | null>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(prices)) {
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}

// Compact home-page PnL summary if the user has any open or closed positions.
export function PnlSummary({ latestPrices }: Props) {
  const [mounted, setMounted] = useState(false);
  const [positions, setPositions] = useState<ReturnType<typeof loadPositions>>([]);

  useEffect(() => {
    const sync = () => setPositions(loadPositions());
    sync();
    setMounted(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(POSITIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted || positions.length === 0) return null;
  const stats = computePositionStats(positions, asPriceMap(latestPrices));

  const realizedTotal = Object.values(stats.realizedByCurrency).reduce((s, v) => s + v, 0);
  const unrealizedTotal = Object.values(stats.unrealizedByCurrency).reduce((s, v) => s + v, 0);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mein P/L</h2>
        <Link href="/positions" className="text-[10px] text-sky-300 hover:text-sky-200">Positionen →</Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Offen" value={String(stats.open)} />
        <Stat label="Abgeschlossen" value={String(stats.closed)} />
        <Stat label="Realisiert" value={`${realizedTotal >= 0 ? '+' : ''}${realizedTotal.toFixed(0)}`} tone={realizedTotal > 0 ? 'good' : realizedTotal < 0 ? 'bad' : 'neutral'} />
        <Stat label="Unrealisiert" value={`${unrealizedTotal >= 0 ? '+' : ''}${unrealizedTotal.toFixed(0)}`} tone={unrealizedTotal > 0 ? 'good' : unrealizedTotal < 0 ? 'bad' : 'neutral'} />
      </div>
      {stats.winRate !== null && (
        <p className="text-[11px] text-slate-400">
          Trefferquote bei abgeschlossenen Trades: <span className={`font-mono ${stats.winRate >= 0.5 ? 'text-emerald-300' : 'text-rose-300'}`}>{Math.round(stats.winRate * 100)}%</span>
          {' '}({stats.wins}W / {stats.losses}L)
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-100';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}
