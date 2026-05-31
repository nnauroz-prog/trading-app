'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { POSITIONS_CHANGED_EVENT, loadPositions } from '@/lib/positions';
import { Position } from '@/lib/types/positions';

interface Stats {
  openCount: number;
  withoutStop: number;
  nearStop: number;
  nearTp: number;
  totalRiskPct: number;
}

function priceKeyForPosition(p: Position): string | null {
  const ticker = p.ticker ?? p.underlying;
  if (!ticker) return null;
  return ticker.toLowerCase().replace(/usdt$/, '');
}

function compute(positions: Position[], latestPrices: Record<string, number | null>): Stats {
  const open = positions.filter((p) => p.status === 'open');
  let withoutStop = 0;
  let nearStop = 0;
  let nearTp = 0;
  let totalRisk = 0;
  for (const p of open) {
    if (p.stopLossPlanned === null) withoutStop++;
    const key = priceKeyForPosition(p);
    const live = key ? latestPrices[key] : null;
    if (live !== null && live !== undefined && live > 0) {
      if (p.stopLossPlanned !== null && p.stopLossPlanned > 0) {
        const distToStopPct = ((live - p.stopLossPlanned) / live) * 100;
        if (distToStopPct >= 0 && distToStopPct <= 2) nearStop++;
        totalRisk += Math.max(0, distToStopPct);
      }
      if (p.takeProfitPlanned !== null && p.takeProfitPlanned > 0) {
        const distToTpPct = ((p.takeProfitPlanned - live) / live) * 100;
        if (distToTpPct >= 0 && distToTpPct <= 2) nearTp++;
      }
    }
  }
  return {
    openCount: open.length,
    withoutStop,
    nearStop,
    nearTp,
    totalRiskPct: Math.round(totalRisk * 10) / 10
  };
}

// Compact Kapital-Schutz card for the home page. Surfaces the highest-priority
// position risks — positions without stop, positions near stop, positions
// near take-profit.
export function KapitalSchutz({ latestPrices }: { latestPrices: Record<string, number | null> }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setPositions(loadPositions());
    sync();
    setMounted(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(POSITIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const s = compute(positions, latestPrices);
  if (s.openCount === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 text-[12px] text-slate-400">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Kapital-Schutz</h2>
        <p className="mt-1">Keine offenen Positionen — Kapital ist in Cash. Eine neue Position bewusst eröffnen, nicht „weil heute Trading-Tag ist“.</p>
      </section>
    );
  }

  const alerts: string[] = [];
  if (s.withoutStop > 0) alerts.push(`${s.withoutStop} Position${s.withoutStop === 1 ? '' : 'en'} ohne Stop — bevor neue Trades, erst Exit-Regeln setzen.`);
  if (s.nearStop > 0) alerts.push(`${s.nearStop} Position${s.nearStop === 1 ? '' : 'en'} nahe Stop — prüfen, ob nachziehen oder durchhalten.`);
  if (s.nearTp > 0) alerts.push(`${s.nearTp} Position${s.nearTp === 1 ? '' : 'en'} nahe Ziel — Teil-Gewinn oder Stop nachziehen?`);

  const tone =
    s.withoutStop > 0 || s.nearStop > 0 ? 'border-rose-500/40 bg-rose-950/20' :
    s.nearTp > 0 ? 'border-amber-400/40 bg-amber-950/20' :
    'border-slate-800 bg-slate-900/40';

  return (
    <section className={`space-y-2 rounded-2xl border-2 p-4 ${tone}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Kapital-Schutz</h2>
        <Link href="/positions" className="text-[10px] text-sky-300 hover:text-sky-200">verwalten →</Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
          <div className="uppercase tracking-wider text-slate-500">Offen</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-slate-100">{s.openCount}</div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
          <div className="uppercase tracking-wider text-slate-500">Ohne Stop</div>
          <div className={`mt-0.5 font-mono text-sm font-bold ${s.withoutStop > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{s.withoutStop}</div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
          <div className="uppercase tracking-wider text-slate-500">Nahe Stop / Ziel</div>
          <div className="mt-0.5 font-mono text-sm font-bold text-amber-300">{s.nearStop + s.nearTp}</div>
        </div>
      </div>
      {alerts.length > 0 && (
        <ul className="space-y-0.5 text-[12px] text-slate-200">
          {alerts.map((a, i) => <li key={i}>· {a}</li>)}
        </ul>
      )}
    </section>
  );
}
