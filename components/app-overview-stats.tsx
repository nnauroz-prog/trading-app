'use client';

import { useEffect, useState } from 'react';
import { TIER_90_JOURNAL_CHANGED_EVENT, loadTier90Journal, summariseTier90 } from '@/lib/agents/tier-90-journal';
import { SPORT_TIER_90_JOURNAL_CHANGED_EVENT, loadSportTier90Journal, summariseSportTier90 } from '@/lib/sport/sport-tier-90-journal';

interface Props {
  todayFixtureCount: number;
  weekFixtureCount: number;
  totalFirmenMitarbeiter: number;
}

// Vier-Kachel-Übersicht ganz unten als „Du hast" — gibt der App-Hauptseite
// ein klares Schlusswort: was hat dieser Tag/diese Woche, was hat die Firma
// schon erreicht.
export function AppOverviewStats({ todayFixtureCount, weekFixtureCount, totalFirmenMitarbeiter }: Props) {
  const [tradingStats, setTradingStats] = useState(() => summariseTier90([]));
  const [sportStats, setSportStats] = useState(() => summariseSportTier90([]));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => {
      setTradingStats(summariseTier90(loadTier90Journal()));
      setSportStats(summariseSportTier90(loadSportTier90Journal()));
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
  if (!mounted) return null;
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Cell label="Heute Spiele" value={String(todayFixtureCount)} />
      <Cell label="Woche Spiele" value={String(weekFixtureCount)} />
      <Cell label="Firmen-Crew" value={String(totalFirmenMitarbeiter)} />
      <Cell label="Tier-90 Picks" value={String(tradingStats.total + sportStats.total)} />
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold text-slate-100">{value}</div>
    </div>
  );
}
