'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeSubAgentAccuracy, type SubAgentAccuracyRow } from '@/lib/agents/sub-agent-accuracy';

const FIRMA_LABEL: Record<string, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

const ROLE_LABEL: Record<string, string> = {
  analyst: 'Markt-Analyst',
  scout: 'Scout',
  risk: 'Risiko-Manager',
  news: 'News-Watcher',
  liquidity: 'Liquiditäts-Spezialist',
  backtest: 'Backtest-Auditor'
};

// Leaderboard aller Sub-Agenten über alle drei Firmen. Lädt das lokale
// Firma-Tagebuch + Intel-Log, berechnet pro Sub-Agent die Trefferquote und
// rendert Top 5 + Bottom 3, sortiert nach Hit-Rate.
export function SubAgentLeaderboard() {
  const [rows, setRows] = useState<SubAgentAccuracyRow[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      setRows(computeSubAgentAccuracy(firmaLog, (d) => priceMap.get(d) ?? null));
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    };
  }, []);

  if (!mounted) return null;
  const eligible = rows.filter((r) => r.evaluated >= 5 && r.hitRatePct !== null);
  if (eligible.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Sub-Agent-Leaderboard</h2>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">
          Sobald mindestens 5 ausgewertete Entscheidungen pro Sub-Agent im Tagebuch sind, erscheint hier das Ranking — sortiert nach historischer Trefferquote über alle drei Firmen.
        </p>
      </section>
    );
  }
  const sorted = [...eligible].sort((a, b) => (b.hitRatePct ?? 0) - (a.hitRatePct ?? 0) || b.evaluated - a.evaluated);
  const top5 = sorted.slice(0, 5);
  const bottom3 = sorted.slice(-3).reverse();

  return (
    <section className="space-y-3 rounded-2xl border-2 border-sky-400/40 bg-slate-900/60 p-4">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Sub-Agent-Leaderboard</h2>
        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
          Alle Sub-Agenten der drei Firmen sortiert nach historischer Trefferquote (aus deinem Firma-Tagebuch + Intel-Log). Mindestens 5 ausgewertete Calls pro Rolle erforderlich.
        </p>
      </header>

      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">🏆 Top 5</div>
        <ul className="space-y-1">
          {top5.map((r, i) => (
            <li key={`${r.firma}-${r.role}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
              <span className="font-mono text-[10px] text-emerald-300">#{i + 1}</span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-100">{ROLE_LABEL[r.role] ?? r.role}</div>
                <div className="truncate text-[9.5px] text-slate-500">{FIRMA_LABEL[r.firma] ?? r.firma}</div>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{r.rightCalls}/{r.evaluated}</span>
              <span className={`font-mono text-[11px] font-bold ${(r.hitRatePct ?? 0) >= 60 ? 'text-emerald-300' : (r.hitRatePct ?? 0) >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>
                {r.hitRatePct} %
              </span>
            </li>
          ))}
        </ul>
      </div>

      {bottom3.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">📉 Schwächste 3</div>
          <ul className="space-y-1">
            {bottom3.map((r) => (
              <li key={`${r.firma}-${r.role}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-[11px]">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-100">{ROLE_LABEL[r.role] ?? r.role}</div>
                  <div className="truncate text-[9.5px] text-slate-500">{FIRMA_LABEL[r.firma] ?? r.firma}</div>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{r.rightCalls}/{r.evaluated}</span>
                <span className="font-mono text-[11px] font-bold text-rose-300">{r.hitRatePct} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
