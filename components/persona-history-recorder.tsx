'use client';

import { useEffect } from 'react';
import { recordVerdict, type HistoryEntry } from '@/lib/agents/persona-history';

// Client-Komponente: speichert die heutigen Verdicts in localStorage.
// Idempotent — pro Tag und Persona maximal ein Eintrag.

export function PersonaHistoryRecorder({ entries }: { entries: HistoryEntry[] }) {
  useEffect(() => {
    for (const e of entries) {
      recordVerdict(e);
    }
  }, [entries]);
  return null;
}
