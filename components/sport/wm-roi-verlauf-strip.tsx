'use client';

// PnL-Verlauf der letzten 14 Tage als kompakte Sparkline.
// Versteckt sich solange keine entschiedenen Stakes im Fenster liegen.

import { useEffect, useState } from 'react';
import { buildWmRoiVerlauf } from '@/lib/sport/wm-roi-verlauf';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import {
  loadStakeRecords,
  WM_BANKROLL_LEDGER_CHANGED_EVENT
} from '@/lib/sport/wm-bankroll-ledger-store';

interface Props {
  todayIso: string;
  windowDays?: number;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 200;
  const h = 36;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const y = (v: number) => h - ((v - min) / range) * h;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const lastPositive = points[points.length - 1] >= 0;
  const zeroY = y(0).toFixed(1);
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.25)" strokeDasharray="2 2" />
      <path d={path} fill="none" stroke={lastPositive ? '#34d399' : '#fb7185'} strokeWidth="1.5" />
    </svg>
  );
}

export function WmRoiVerlaufStrip({ todayIso, windowDays = 14 }: Props) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted) return null;
  void tick;

  const v = buildWmRoiVerlauf(loadWmPickLog(), loadStakeRecords(), todayIso, windowDays);
  if (!v.hasData) return null;

  const tone = v.totalPnl > 0
    ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
    : v.totalPnl < 0
      ? 'border-rose-400/50 bg-rose-500/10 text-rose-100'
      : 'border-slate-700 bg-slate-900/40 text-slate-200';

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-2 ${tone}`} aria-label="ROI-Verlauf">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9.5px] uppercase tracking-wider opacity-70">Letzte {v.dates.length} Tage</span>
        <span className="font-mono text-[14px] font-bold">{v.totalPnl >= 0 ? '+' : ''}{v.totalPnl.toFixed(2)} EUR</span>
      </div>
      <Sparkline points={v.cumulativePnl} />
      <span className="text-[9.5px] opacity-70">{v.fromIso} → {v.toIso}</span>
    </div>
  );
}
