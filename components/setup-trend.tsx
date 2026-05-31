'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';

interface TrendPoint {
  date: string;
  passedCount: number;
}

interface CoinTrend {
  coin: string;
  points: TrendPoint[];
  trend: 'up' | 'down' | 'flat';
  latest: number;
  delta: number; // change from first to last point
}

function aggregateTrends(log: FirmaDecision[]): CoinTrend[] {
  // For each coin, collect the highest passedCount seen on each date
  // (because three firmas can name different coins; we want one number per coin per day).
  const byCoinDate = new Map<string, Map<string, number>>();
  for (const e of log) {
    if (!e.coin || e.passedCount === null) continue;
    if (!byCoinDate.has(e.coin)) byCoinDate.set(e.coin, new Map());
    const m = byCoinDate.get(e.coin)!;
    const existing = m.get(e.date) ?? 0;
    if (e.passedCount > existing) m.set(e.date, e.passedCount);
  }
  const out: CoinTrend[] = [];
  for (const [coin, m] of byCoinDate.entries()) {
    const dates = Array.from(m.keys()).sort();
    if (dates.length < 2) continue;
    const points: TrendPoint[] = dates.map((d) => ({ date: d, passedCount: m.get(d)! }));
    const latest = points[points.length - 1].passedCount;
    const first = points[0].passedCount;
    const delta = latest - first;
    const trend: CoinTrend['trend'] = delta >= 1 ? 'up' : delta <= -1 ? 'down' : 'flat';
    out.push({ coin, points: points.slice(-7), trend, latest, delta });
  }
  // Most recent strong setups first
  out.sort((a, b) => b.latest - a.latest);
  return out.slice(0, 5);
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const max = 12;
  const min = 0;
  const w = 80;
  const h = 16;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p.passedCount - min) / (max - min)) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={i * step} cy={h - ((p.passedCount - min) / (max - min)) * h} r="1.5" fill="currentColor" />
      ))}
    </svg>
  );
}

export function SetupTrend() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadFirmaLog());
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const trends = aggregateTrends(log);
  if (trends.length === 0) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Setup-Verlauf der letzten Tage</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Wie hat sich die Häkchen-Anzahl pro Coin entwickelt? Aufsteigende Linie = Setup baut sich auf. Fallende Linie = Setup zerbröselt.
        </p>
      </div>
      <ul className="space-y-1.5">
        {trends.map((t) => {
          const colorClass = t.trend === 'up' ? 'text-emerald-300' : t.trend === 'down' ? 'text-rose-300' : 'text-slate-400';
          const arrow = t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→';
          return (
            <li key={t.coin} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <span className="font-mono text-sm font-bold text-white">{t.coin}</span>
              <span className={colorClass}>
                <Sparkline points={t.points} />
              </span>
              <span className="font-mono text-[11px] text-slate-300">{t.latest} von 12 heute</span>
              <span className={`font-mono text-[11px] ${colorClass}`}>
                {arrow} {t.delta > 0 ? '+' : ''}{t.delta}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
