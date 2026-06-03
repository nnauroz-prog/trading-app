'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeSubAgentAccuracy, type SubAgentAccuracyRow } from '@/lib/agents/sub-agent-accuracy';
import type { PersonaId } from '@/lib/agents/personas';

interface Props {
  firma: PersonaId;
  role: string; // 'analyst', 'scout', 'risk', 'news', 'liquidity', 'backtest'
}

const TONE = {
  good: 'text-emerald-300 border-emerald-400/40',
  medium: 'text-amber-300 border-amber-400/40',
  bad: 'text-rose-300 border-rose-400/40',
  neutral: 'text-slate-500 border-slate-800'
};

// Zeigt die historische Trefferquote dieses Sub-Agenten für diese Firma —
// kommt aus dem lokalen Firma-Tagebuch + dem Intel-Preis-Log.
export function SubAgentHitRateBadge({ firma, role }: Props) {
  const [row, setRow] = useState<SubAgentAccuracyRow | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const rows = computeSubAgentAccuracy(firmaLog, (d) => priceMap.get(d) ?? null);
      const match = rows.find((r) => r.firma === firma && r.role === role) ?? null;
      setRow(match);
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    };
  }, [firma, role]);

  if (!mounted) return null;
  if (!row || row.evaluated < 5 || row.hitRatePct === null) {
    return <span className={`rounded border px-1 py-0.5 font-mono text-[8.5px] ${TONE.neutral}`} title="zu wenig Daten">—</span>;
  }
  const tone = row.hitRatePct >= 60 ? TONE.good : row.hitRatePct >= 50 ? TONE.medium : TONE.bad;
  return (
    <span
      className={`rounded border px-1 py-0.5 font-mono text-[8.5px] ${tone}`}
      title={`${row.rightCalls}/${row.evaluated} richtige Calls aus dem Firma-Tagebuch`}
    >
      {row.hitRatePct}%
    </span>
  );
}
