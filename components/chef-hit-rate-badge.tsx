'use client';

// Klein-Badge für die Track-Record-Quote des Chefredakteurs (Intel-Lagebericht).
// Liest computeIntelAccuracy aus dem lokalen Intel-Log und blendet die Hit-Rate
// neben dem Lagebericht-Header ein — analog zu FirmaHitRateBadge für Firmas.

import { useEffect, useState } from 'react';
import { INTEL_LOG_CHANGED_EVENT, computeIntelAccuracy, loadIntelLog, type IntelAccuracy } from '@/lib/intel/memory';

const MIN_EVAL = 5;

const TONE = {
  good: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
  medium: 'text-slate-200 border-slate-700 bg-slate-900/40',
  bad: 'text-rose-300 border-rose-400/40 bg-rose-500/10',
  neutral: 'text-slate-500 border-slate-800 bg-slate-950/40'
};

export function ChefHitRateBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const [acc, setAcc] = useState<IntelAccuracy | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setAcc(computeIntelAccuracy(loadIntelLog()));
    sync();
    setMounted(true);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const padding = size === 'md' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1 py-0.5 text-[8.5px]';
  if (!acc || acc.evaluated < MIN_EVAL || acc.hitRatePct === null) {
    return (
      <span
        className={`rounded border font-mono ${padding} ${TONE.neutral}`}
        title="Chefredakteur sammelt noch Track-Record (zu wenig Daten)."
      >
        —
      </span>
    );
  }
  const tone = acc.hitRatePct >= 60 ? TONE.good : acc.hitRatePct >= 45 ? TONE.medium : TONE.bad;
  return (
    <span
      className={`rounded border font-mono font-bold ${padding} ${tone}`}
      title={`Chefredakteur: ${acc.rightCalls} von ${acc.evaluated} bewerteten Tagen richtig.`}
    >
      {acc.hitRatePct}%
    </span>
  );
}
