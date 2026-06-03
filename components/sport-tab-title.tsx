'use client';

import { useEffect } from 'react';
import { SPORT_TIP_JOURNAL_CHANGED_EVENT, loadTipJournal } from '@/lib/sport/tip-journal';

const BASE_TITLE = 'Sport · Trading Desk';

// Schreibt die Anzahl offener Tipps in den Browser-Tab-Titel. So sieht der
// User auf Mobile (PWA-Tabs) oder Desktop sofort, dass noch etwas offen ist.
export function SportTabTitle() {
  useEffect(() => {
    const apply = () => {
      const pending = loadTipJournal().filter((e) => e.outcome === 'pending').length;
      document.title = pending > 0 ? `(${pending}) ${BASE_TITLE}` : BASE_TITLE;
    };
    apply();
    window.addEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, apply);
    return () => {
      window.removeEventListener(SPORT_TIP_JOURNAL_CHANGED_EVENT, apply);
      document.title = 'Trading Desk';
    };
  }, []);

  return null;
}
