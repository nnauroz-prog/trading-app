'use client';

// Klein-Badge mit der historischen Treffer-Quote der gesamten Firma. Spiegel
// von SubAgentHitRateBadge auf Firma-Ebene. Wird neben dem Firma-Namen in
// PerCoinFirmaTakes + FirmaCandidateRundown eingeblendet, damit der Lern-
// Loop dort sichtbar wird, wo der User Verdicts liest.

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, loadFirmaLog } from '@/lib/firma-memory';
import { INTEL_LOG_CHANGED_EVENT, loadIntelLog } from '@/lib/intel/memory';
import { computeFirmaAccuracy, MIN_EVAL_FOR_SKILL, type FirmaAccuracy } from '@/lib/firma-accuracy';
import type { PersonaId } from '@/lib/agents/personas';

interface Props {
  firma: PersonaId;
  // size='sm' für Inline-Listen, size='md' für Karten-Kopfzeilen.
  size?: 'sm' | 'md';
}

const TONE = {
  good: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
  medium: 'text-slate-200 border-slate-700 bg-slate-900/40',
  bad: 'text-rose-300 border-rose-400/40 bg-rose-500/10',
  neutral: 'text-slate-500 border-slate-800 bg-slate-950/40'
};

export function FirmaHitRateBadge({ firma, size = 'sm' }: Props) {
  const [row, setRow] = useState<FirmaAccuracy | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const firmaLog = loadFirmaLog();
      const intelLog = loadIntelLog();
      const priceMap = new Map<string, number>();
      for (const s of intelLog) if (s.btcPriceAtRecord !== null) priceMap.set(s.date, s.btcPriceAtRecord);
      const rows = computeFirmaAccuracy(firmaLog, (d) => priceMap.get(d) ?? null);
      setRow(rows.find((r) => r.firma === firma) ?? null);
    };
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    window.addEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
      window.removeEventListener(INTEL_LOG_CHANGED_EVENT, sync);
    };
  }, [firma]);

  if (!mounted) return null;
  const padding = size === 'md' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1 py-0.5 text-[8.5px]';
  if (!row || row.evaluated < MIN_EVAL_FOR_SKILL || row.hitRatePct === null) {
    return (
      <span
        className={`rounded border font-mono ${padding} ${TONE.neutral}`}
        title="Noch zu wenig Entscheidungen im Track-Record dieser Firma."
      >
        —
      </span>
    );
  }
  const tone = row.hitRatePct >= 60 ? TONE.good : row.hitRatePct >= 45 ? TONE.medium : TONE.bad;
  return (
    <span
      className={`rounded border font-mono font-bold ${padding} ${tone}`}
      title={`Track-Record: ${row.rightCalls} von ${row.evaluated} bewerteten Entscheidungen richtig.`}
    >
      {row.hitRatePct}%
    </span>
  );
}
