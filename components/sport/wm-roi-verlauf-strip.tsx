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

function Sparkline({ total, hoechste, modell }: { total: number[]; hoechste: number[]; modell: number[] }) {
  if (total.length < 2) return null;
  const w = 200;
  const h = 36;
  const all = [...total, ...hoechste, ...modell, 0];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const step = w / (total.length - 1);
  const y = (v: number) => h - ((v - min) / range) * h;
  const toPath = (pts: number[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const totalLast = total[total.length - 1];
  const zeroY = y(0).toFixed(1);
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.25)" strokeDasharray="2 2" />
      <path d={toPath(hoechste)} fill="none" stroke="#a78bfa" strokeOpacity="0.8" strokeWidth="1" strokeDasharray="3 2" />
      <path d={toPath(modell)} fill="none" stroke="#38bdf8" strokeOpacity="0.8" strokeWidth="1" strokeDasharray="3 2" />
      <path d={toPath(total)} fill="none" stroke={totalLast >= 0 ? '#34d399' : '#fb7185'} strokeWidth="1.8" />
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

  const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)} EUR`;

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-2 ${tone}`} aria-label="ROI-Verlauf">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9.5px] uppercase tracking-wider opacity-70">Letzte {v.dates.length} Tage</span>
        <span className="font-mono text-[14px] font-bold">{fmt(v.totalPnl)}</span>
      </div>
      <Sparkline total={v.cumulativePnl} hoechste={v.cumulativeHoechsteKonfluenz} modell={v.cumulativeModellFavorit} />
      <div className="flex flex-col gap-0.5 text-[9.5px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ background: '#a78bfa' }} />
          <span className="opacity-70">Hoechste Konf.</span>
          <span className="font-mono">{fmt(v.totalHoechsteKonfluenz)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ background: '#38bdf8' }} />
          <span className="opacity-70">Modell-Favorit</span>
          <span className="font-mono">{fmt(v.totalModellFavorit)}</span>
        </span>
      </div>
      <span className="text-[9.5px] opacity-70">{v.fromIso} → {v.toIso}</span>
    </div>
  );
}
