'use client';

import { useEffect } from 'react';
import { ChefredakteurReport, EmployeeReport } from '@/lib/intel/types';
import { buildIntelSnapshot, recordIntelSnapshot } from '@/lib/intel/memory';

interface Props {
  reports: EmployeeReport[];
  ceo: ChefredakteurReport;
  btcPrice: number | null;
  generatedAt: string;
}

// Records the day's Chefredakteur verdict + specialist votes + BTC reference
// price for later accuracy attribution.
export function IntelRecorder({ reports, ceo, btcPrice, generatedAt }: Props) {
  useEffect(() => {
    const neutralCount = reports.filter((r) => r.signal === 'neutral').length;
    const snapshot = buildIntelSnapshot({
      netSignal: ceo.netSignal,
      riskOnCount: ceo.riskOnCount,
      riskOffCount: ceo.riskOffCount,
      neutralCount,
      lagebericht: ceo.lagebericht,
      btcPriceAtRecord: btcPrice,
      specialistVotes: reports.map((r) => ({ id: r.id, title: r.title, signal: r.signal }))
    });
    recordIntelSnapshot(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedAt]);
  return null;
}
