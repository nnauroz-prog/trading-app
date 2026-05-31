'use client';

import { useEffect } from 'react';
import { LehrlingReport } from '@/lib/akademie/lehrling';
import { SpaeherReport } from '@/lib/akademie/spaeher';
import { buildSnapshot, recordAkademieSnapshot } from '@/lib/akademie/memory';

// Headless: records today's Lehrling/Späher result into local storage.
export function AkademieRecorder({ lehrling, spaeher }: { lehrling: LehrlingReport; spaeher: SpaeherReport }) {
  useEffect(() => {
    if (!lehrling.best) return;
    const bullish = spaeher.items.filter((i) => i.impact === 'bullish').length;
    const bearish = spaeher.items.filter((i) => i.impact === 'bearish').length;
    const neutral = spaeher.items.length - bullish - bearish;
    const snapshot = buildSnapshot({
      bestVariantId: lehrling.best.id,
      bestParams: lehrling.best.params,
      bestNetReturnPct: lehrling.best.netReturnPct,
      bestWinRatePct: lehrling.best.winRatePct,
      bestTotalTrades: lehrling.best.totalTrades,
      baselineId: lehrling.baseline?.id ?? lehrling.best.id,
      baselineNetReturnPct: lehrling.baseline?.netReturnPct ?? lehrling.best.netReturnPct,
      newsBullish: bullish,
      newsBearish: bearish,
      newsNeutral: neutral,
      newsTopTitle: spaeher.topPick?.title ?? null,
      newsTopScore: spaeher.topPick?.score ?? null,
      newsTopImpact: spaeher.topPick?.impact ?? null
    });
    recordAkademieSnapshot(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lehrling.generatedAt]);

  return null;
}
