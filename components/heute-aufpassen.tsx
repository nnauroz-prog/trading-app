'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { POSITIONS_CHANGED_EVENT, loadPositions } from '@/lib/positions';
import { runRiskGuardian, RiskGuardianReport, MarketContext } from '@/lib/risk/risk-guardian';
import { loadConfig } from '@/lib/account-config';
import { loadUserProfile } from '@/lib/user-profile';
import { RiskGuardianPanel } from '@/components/risk-guardian-panel';

export function HeuteAufpassen({
  latestPrices,
  marketContext
}: {
  latestPrices: Record<string, number | null>;
  marketContext: MarketContext;
}) {
  const [report, setReport] = useState<RiskGuardianReport | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const positions = loadPositions();
      const config = loadConfig();
      const profile = loadUserProfile();
      const cleanPrices: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(latestPrices)) {
        cleanPrices[k] = typeof v === 'number' ? v : null;
      }
      setReport(runRiskGuardian(positions, cleanPrices, config, profile, marketContext));
    };
    refresh();
    setMounted(true);
    window.addEventListener(POSITIONS_CHANGED_EVENT, refresh);
    window.addEventListener('trading-app:config-changed', refresh);
    window.addEventListener('trading-app:profile-changed', refresh);
    return () => {
      window.removeEventListener(POSITIONS_CHANGED_EVENT, refresh);
      window.removeEventListener('trading-app:config-changed', refresh);
      window.removeEventListener('trading-app:profile-changed', refresh);
    };
  }, [latestPrices, marketContext]);

  if (!mounted || !report) return null;

  if (report.openPositions === 0 && marketContext.todaysVerdict === 'trade') {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">⚠ Heute aufpassen</h2>
        <Link href="/positions" className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-emerald-300">
          Alle Positionen →
        </Link>
      </div>
      <RiskGuardianPanel report={report} compact />
    </section>
  );
}
