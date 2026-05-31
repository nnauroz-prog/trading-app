'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, IntelSnapshot, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy } from '@/lib/firma-accuracy';

function btcPriceLookup(intelLog: IntelSnapshot[]) {
  const map = new Map<string, number>();
  for (const s of intelLog) {
    if (s.btcPriceAtRecord !== null) map.set(s.date, s.btcPriceAtRecord);
  }
  return (date: string): number | null => map.get(date) ?? null;
}

export function FirmaAccuracyPanel() {
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
  const accuracy = computeFirmaAccuracy(firmaLog, btcPriceLookup(intelLog));
  const hasAnyData = accuracy.some((a) => a.evaluated > 0);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Firmen-Trefferquote</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Pro Firma: wie oft hat das Verdikt am Folgetag zum tatsächlichen BTC-Move gepasst? BUY ist „richtig“, wenn BTC ≥0.5% stieg. WAIT ist „richtig“, wenn BTC nicht stark stieg (keine verpasste Chance). Braucht beides — Firma-Tagebuch UND Chefredakteur-Tagebuch mit BTC-Snapshots.
        </p>
      </div>
      {!hasAnyData ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-center text-[11px] text-slate-500">
          Noch zu wenig Daten für eine Trefferquoten-Auswertung — beide Tagebücher brauchen mindestens 2 Tage mit BTC-Preisen.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {accuracy.map((a) => {
            const tone = a.hitRatePct === null ? 'border-slate-700' : a.hitRatePct >= 55 ? 'border-emerald-400/40' : a.hitRatePct < 45 ? 'border-rose-400/40' : 'border-slate-700';
            const cls = a.hitRatePct === null ? 'text-slate-400' : a.hitRatePct >= 55 ? 'text-emerald-300' : a.hitRatePct < 45 ? 'text-rose-300' : 'text-slate-300';
            return (
              <li key={a.firma} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border bg-slate-950/40 px-3 py-2 ${tone}`}>
                <span className="text-[12px] font-bold text-white">{a.firmaName}</span>
                <span className="font-mono text-[11px] text-slate-400">{a.rightCalls}/{a.evaluated}</span>
                <span className={`font-mono text-sm font-bold ${cls}`}>
                  {a.hitRatePct !== null ? `${a.hitRatePct}%` : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
