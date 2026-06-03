'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TIER_90_JOURNAL_CHANGED_EVENT, loadTier90Journal, summariseTier90 } from '@/lib/agents/tier-90-journal';
import { SPORT_TIER_90_JOURNAL_CHANGED_EVENT, loadSportTier90Journal, summariseSportTier90 } from '@/lib/sport/sport-tier-90-journal';

// Mini-Zusammenfassung beider Tier-90-Tagebücher (Trading + Sport) für die
// Startseite. Verlinkt auf /agent für das Trading-Tagebuch und /sport fürs
// Sport-Tagebuch. Stumm wenn beide leer sind.
export function Tier90HomeSummary() {
  const [trading, setTrading] = useState(() => summariseTier90([]));
  const [sport, setSport] = useState(() => summariseSportTier90([]));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => {
      setTrading(summariseTier90(loadTier90Journal()));
      setSport(summariseSportTier90(loadSportTier90Journal()));
    };
    sync();
    setMounted(true);
    window.addEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
    window.addEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(TIER_90_JOURNAL_CHANGED_EVENT, sync);
      window.removeEventListener(SPORT_TIER_90_JOURNAL_CHANGED_EVENT, sync);
    };
  }, []);
  if (!mounted || (trading.total === 0 && sport.total === 0)) return null;

  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {trading.total > 0 && (
        <Link
          href="/agent#tier-90"
          className="block rounded-2xl border border-yellow-300/40 bg-yellow-950/15 p-3 transition hover:border-yellow-300/70"
        >
          <div className="text-[10px] uppercase tracking-wider text-yellow-300">⚜ Tier-90 · Trading</div>
          <div className="mt-0.5 text-sm font-bold text-white">{trading.total} Picks · {trading.hitRatePct ?? '—'} {trading.hitRatePct !== null ? '%' : ''} Trefferquote</div>
          <div className="text-[10px] text-slate-400">
            Treffer: {trading.tpHit} · Stop: {trading.stopHit} · Offen: {trading.pending}
          </div>
        </Link>
      )}
      {sport.total > 0 && (
        <Link
          href="/sport#tier-90"
          className="block rounded-2xl border border-yellow-300/40 bg-yellow-950/15 p-3 transition hover:border-yellow-300/70"
        >
          <div className="text-[10px] uppercase tracking-wider text-yellow-300">⚜ Tier-90 · Sport</div>
          <div className="mt-0.5 text-sm font-bold text-white">{sport.total} Picks · {sport.hitRatePct ?? '—'} {sport.hitRatePct !== null ? '%' : ''} Trefferquote</div>
          <div className="text-[10px] text-slate-400">
            Treffer: {sport.wins} · Daneben: {sport.losses} · Offen: {sport.pending}
          </div>
        </Link>
      )}
    </section>
  );
}
