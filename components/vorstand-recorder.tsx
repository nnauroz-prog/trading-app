'use client';

import { useEffect } from 'react';
import { VorstandReport } from '@/lib/agents/vorstand';
import { recordVorstand } from '@/lib/agents/vorstand-memory';

export function VorstandRecorder({ report, generatedAt }: { report: VorstandReport; generatedAt: string }) {
  useEffect(() => {
    recordVorstand({
      verdict: report.verdict,
      consensusCoin: report.consensusCoin,
      buyCount: 0, // not enough info from the report alone; reserved for future
      conflictCount: report.conflictNotes.length,
      headline: report.headline
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedAt]);
  return null;
}
