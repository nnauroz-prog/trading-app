'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WATCHLIST_CHANGED_EVENT, WatchlistItem, loadWatchlist } from '@/lib/watchlist';
import {
  COIN_SCORE_CHANGED_EVENT,
  CoinScoreRecord,
  loadCoinScoreHistory,
  summariseCoinTrend
} from '@/lib/coin-score-history';

const MAX_BARS = 14;
const MAX_COUNT = 12;

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const padded = values.slice(-MAX_BARS);
  return (
    <div className="flex h-6 items-end gap-[2px]">
      {padded.map((v, i) => {
        const h = Math.max(2, Math.round((v / MAX_COUNT) * 100));
        const color = v >= 9 ? 'bg-emerald-400' : v >= 7 ? 'bg-sky-400' : v >= 5 ? 'bg-amber-400' : 'bg-slate-600';
        return <div key={i} style={{ height: `${h}%` }} className={`w-1.5 rounded-sm ${color}`} />;
      })}
    </div>
  );
}

function deltaLabel(delta: number | null): { text: string; tone: 'good' | 'bad' | 'neutral' } {
  if (delta === null) return { text: '—', tone: 'neutral' };
  if (delta > 0) return { text: `+${delta}`, tone: 'good' };
  if (delta < 0) return { text: `${delta}`, tone: 'bad' };
  return { text: '±0', tone: 'neutral' };
}

export function CoinScoreTrend() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [records, setRecords] = useState<CoinScoreRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setWatchlist(loadWatchlist());
      setRecords(loadCoinScoreHistory());
    };
    sync();
    setMounted(true);
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    window.addEventListener(COIN_SCORE_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
      window.removeEventListener(COIN_SCORE_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;
  if (watchlist.length === 0) return null;

  const rows = watchlist
    .map((w) => ({ item: w, trend: summariseCoinTrend(records, w.coinId) }))
    .filter((r) => r.trend !== null && r.trend.history.length >= 2);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Konfluenz-Verlauf (14 Tage)</h2>
        <span className="text-[10px] text-slate-500">je länger der Balken, desto mehr Häkchen</span>
      </div>
      <p className="text-[10.5px] leading-snug text-slate-500">
        Pro Watchlist-Coin der tägliche Konfluenz-Wert (0–12). Trend nach oben = das Setup wird stärker, nach unten = es zerbröselt.
      </p>
      <ul className="space-y-1.5">
        {rows.map(({ item, trend }) => {
          const d7 = deltaLabel(trend!.delta7d);
          return (
            <li key={item.coinId} className="grid grid-cols-[3.5rem_1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5">
              <Link href={`/assets/${item.symbol.toLowerCase()}`} className="font-mono text-[11px] font-bold text-white hover:text-emerald-300">
                {item.symbol}
              </Link>
              <Sparkline values={trend!.history.map((h) => h.passedCount)} />
              <span className="font-mono text-[10.5px] text-slate-300" title="Häkchen heute">
                {trend!.latest}/12
              </span>
              <span
                className={`font-mono text-[10px] ${d7.tone === 'good' ? 'text-emerald-300' : d7.tone === 'bad' ? 'text-rose-300' : 'text-slate-500'}`}
                title="Veränderung zu vor 7 Tagen"
              >
                7d {d7.text}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
