'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';
import { computeHitRateTrend, summarizeTrend, type HitRateDay } from '@/lib/sport/hit-rate-trend';

interface Props {
  days?: number;
}

// Inline-SVG-Sparkline für den Trefferquoten-Verlauf der letzten 30 Tage.
// Nutzt das kumulative HitRate, damit Tage ohne Auflösung den Verlauf
// nicht zerreißen. Dezent — gehört unter die Tipprunde-Karte.
export function HitRateSparkline({ days = 30 }: Props) {
  const [trend, setTrend] = useState<HitRateDay[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setTrend(computeHitRateTrend(loadTipJournal(), days));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, sync);
  }, [days]);

  if (!mounted) return null;
  const summary = summarizeTrend(trend);
  if (summary.decisive === 0) return null;

  const w = 240;
  const h = 36;
  const padX = 2;
  const padY = 4;
  const innerW = w - 2 * padX;
  const innerH = h - 2 * padY;

  const points: Array<[number, number]> = [];
  let lastY = innerH; // wenn nirgends ein Wert
  trend.forEach((d, i) => {
    const x = padX + (innerW * i) / Math.max(1, trend.length - 1);
    const v = d.cumulativeHitRatePct;
    const y = padY + (v === null ? lastY : innerH - (innerH * v) / 100);
    if (v !== null) lastY = innerH - (innerH * v) / 100;
    points.push([x, y]);
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const fillPath = `${path} L ${(padX + innerW).toFixed(1)} ${(padY + innerH).toFixed(1)} L ${padX.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;
  const latest = trend[trend.length - 1]?.cumulativeHitRatePct ?? null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Trefferquoten-Verlauf · {days} Tage</span>
        <span className="font-mono text-[10px] text-emerald-300">
          {summary.hitRatePct !== null ? `${summary.hitRatePct}%` : '—'}
          <span className="ml-1 text-slate-500">({summary.wins}/{summary.decisive})</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-9 w-full">
        <path d={fillPath} fill="rgb(16 185 129 / 0.15)" />
        <path d={path} fill="none" stroke="rgb(52 211 153)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <line x1={padX} y1={padY + innerH / 2} x2={padX + innerW} y2={padY + innerH / 2} stroke="rgb(100 116 139 / 0.3)" strokeWidth={0.5} strokeDasharray="2 2" />
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-slate-500">
        <span>{trend[0]?.iso}</span>
        <span className="text-slate-400">aktuell: {latest !== null ? `${latest}%` : '—'}</span>
        <span>{trend[trend.length - 1]?.iso}</span>
      </div>
    </div>
  );
}
