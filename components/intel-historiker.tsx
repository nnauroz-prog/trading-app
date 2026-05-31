'use client';

import { useEffect, useState } from 'react';
import { FIRMA_DECISIONS_CHANGED_EVENT, FirmaDecision, loadFirmaLog } from '@/lib/firma-memory';
import { tradeHistoriker } from '@/lib/intel/employees';
import { IntelContext } from '@/lib/intel/types';

// Client-side Trade-Historiker — needs access to the localStorage diary, so
// it cannot run on the server like the other employees.
export function IntelHistoriker() {
  const [log, setLog] = useState<FirmaDecision[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadFirmaLog());
    sync();
    setMounted(true);
    window.addEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FIRMA_DECISIONS_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  const recentBuyDays = log.filter((d) => d.verdict === 'BUY').length;
  const recentWaitDays = log.filter((d) => d.verdict === 'WAIT').length;
  // Stub context — only the fields the Trade-Historiker actually reads matter.
  const ctx: IntelContext = {
    fearGreed: null, fundingBtcPct: null, fundingEthPct: null, btcDominancePct: null,
    marketMood: 'neutral', btcRegime: 'sideways',
    topCandidates: [], newsTotal: 0, newsBullish: 0, newsBearish: 0,
    newsTopHeadline: null, topCoinSentiment: [],
    backtestPeriodDays: 0, backtestSafeTrades: 0, backtestSafeWinRatePct: null, backtestSafeNetReturnPct: 0,
    nextHighImpactEvent: null, cycleLabel: null, cycleProgressPct: null,
    recentBuyDays, recentWaitDays
  };
  const report = tradeHistoriker(ctx);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">{report.title}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500">{report.department}</span>
      </div>
      <p className="mt-0.5 text-[10px] italic text-slate-500">{report.expertise}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-200">{report.finding}</p>
      {report.detail && <p className="mt-1 text-[10px] font-mono text-slate-500">{report.detail}</p>}
    </div>
  );
}
