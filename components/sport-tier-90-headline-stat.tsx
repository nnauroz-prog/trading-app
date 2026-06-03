'use client';

import { useEffect, useState } from 'react';
import { SPORT_TIER_90_JOURNAL_CHANGED_EVENT, loadSportTier90Journal, summariseSportTier90 } from '@/lib/sport/sport-tier-90-journal';

// Kompakte Sport-Tier-90-Hit-Rate-Pille für die Sport-Tier-90-Karte.
export function SportTier90HeadlineStat() {
  const [stats, setStats] = useState(() => summariseSportTier90([]));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => setStats(summariseSportTier90(loadSportTier90Journal()));
    sync();
    setMounted(true);
    window.addEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
  }, []);
  if (!mounted || stats.total === 0) return null;
  const resolved = stats.wins + stats.losses;
  if (resolved === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
        Tier-90: {stats.pending} offen
      </span>
    );
  }
  const tone = (stats.hitRatePct ?? 0) >= 60 ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
    : (stats.hitRatePct ?? 0) >= 50 ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
    : 'border-rose-400/40 bg-rose-500/10 text-rose-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono ${tone}`}>
      bisher: {stats.wins}/{resolved} · {stats.hitRatePct} %
    </span>
  );
}
