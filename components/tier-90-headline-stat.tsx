'use client';

import { useEffect, useState } from 'react';
import { TIER_90_JOURNAL_CHANGED_EVENT, loadTier90Journal, summariseTier90 } from '@/lib/agents/tier-90-journal';

// Eine sehr kompakte Hit-Rate-Pille für den Header. Zeigt:
// "Tier-90 bisher: X/Y · Z %" wenn aufgelöste Picks vorhanden sind.
// Stumm wenn das Tagebuch leer ist.
export function Tier90HeadlineStat() {
  const [stats, setStats] = useState(() => summariseTier90([]));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => setStats(summariseTier90(loadTier90Journal()));
    sync();
    setMounted(true);
    window.addEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => window.removeEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
  }, []);
  if (!mounted || stats.total === 0) return null;
  const resolved = stats.tpHit + stats.stopHit + stats.expired;
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
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono ${tone}`} title="Trefferquote aus dem Tier-90-Tagebuch">
      Tier-90 bisher: {stats.tpHit}/{resolved} · {stats.hitRatePct} %
    </span>
  );
}
