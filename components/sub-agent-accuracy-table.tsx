'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, IntelSnapshot, loadIntelLog } from '@/lib/intel/memory';
import { computeSubAgentAccuracy, SubAgentAccuracyRow } from '@/lib/agents/sub-agent-accuracy';
import { PersonaId } from '@/lib/agents/personas';

const ROLE_LABELS: Record<string, string> = {
  analyst: 'Markt-Analyst',
  scout: 'Setup-Scout',
  risk: 'Risiko-Manager',
  news: 'News-Watcher',
  liquidity: 'Liquiditäts-Spez.',
  backtest: 'Backtest-Auditor'
};

const FIRMA_LABELS: Record<PersonaId, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

function rateClass(rate: number | null): string {
  if (rate === null) return 'text-slate-500';
  if (rate >= 60) return 'text-emerald-300';
  if (rate >= 45) return 'text-amber-300';
  return 'text-rose-300';
}

export function SubAgentAccuracyTable() {
  const [firmaLog, setFirmaLog] = useState<FirmaDecision[]>([]);
  const [intelLog, setIntelLog] = useState<IntelSnapshot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setFirmaLog(loadFirmaLog());
      setIntelLog(loadIntelLog());
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

  const priceMap = new Map<string, number>();
  for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
  const accuracy = computeSubAgentAccuracy(firmaLog, (date) => priceMap.get(date) ?? null);
  const anyData = accuracy.some((a) => a.evaluated >= 2);

  // Pivot data: rows = role, columns = firma
  const roles = Object.keys(ROLE_LABELS);
  const firmas: PersonaId[] = ['conservative', 'balanced', 'aggressive'];
  const cell = (firma: PersonaId, role: string): SubAgentAccuracyRow | undefined =>
    accuracy.find((a) => a.firma === firma && a.role === role);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sub-Agent-Trefferquoten</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Wie oft jeder einzelne Spezialist innerhalb seiner Firma am Folgetag richtig lag (gemessen am BTC-Move ±0.5%). Braucht das Chefredakteur-Tagebuch für BTC-Preis-Snapshots — wird mit der Zeit aussagekräftiger.
        </p>
      </div>
      {!anyData ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center text-[11px] text-slate-500">
          Noch zu wenig auswertbare Tage. Sobald mindestens 2 Tagespaare mit BTC-Snapshots vorliegen, füllt sich die Tabelle.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Spezialist</th>
                {firmas.map((f) => <th key={f} className="px-2 py-1.5 text-right">{FIRMA_LABELS[f]}</th>)}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role} className="border-b border-slate-900 last:border-b-0">
                  <td className="px-2 py-1.5 text-slate-300">{ROLE_LABELS[role]}</td>
                  {firmas.map((f) => {
                    const c = cell(f, role);
                    if (!c || c.evaluated < 2) {
                      return <td key={f} className="px-2 py-1.5 text-right text-[10px] text-slate-600">—</td>;
                    }
                    return (
                      <td key={f} className="px-2 py-1.5 text-right">
                        <span className={`font-mono text-[11px] font-bold ${rateClass(c.hitRatePct)}`}>{c.hitRatePct}%</span>
                        <span className="ml-1 text-[9px] text-slate-500">({c.rightCalls}/{c.evaluated})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
