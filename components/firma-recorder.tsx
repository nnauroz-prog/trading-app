'use client';

import { useEffect } from 'react';
import { AgentVerdict } from '@/lib/agents/personas';
import { buildFirmaDecisions, recordFirmaDecisions } from '@/lib/firma-memory';

// Headless: silently records today's per-firma verdicts into local storage
// so a per-day track record builds up over time.
export function FirmaRecorder({ personas, generatedAt }: { personas: AgentVerdict[]; generatedAt: string }) {
  useEffect(() => {
    const decisions = buildFirmaDecisions(personas);
    recordFirmaDecisions(decisions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedAt]);

  return null;
}
