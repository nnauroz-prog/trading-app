'use client';

// Headless Resolver: laeuft bei jedem Mount, holt manuelle WM-Resultate
// + (optional) externe finished Fixtures aus dem Liga-Pool, matcht sie
// gegen das WM-Schedule und schreibt die Outcomes ins Pick-Lern-Log.
//
// Rendert nichts sichtbar — der Effekt wird durch die Lern-Status-Karte
// und die Faktor-Gewichte sichtbar.

import { useEffect } from 'react';
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';
import { resolveAndPersistWmPicks } from '@/lib/sport/wm-pick-learning-store';
import {
  matchExternalResults,
  mergeResults,
  type ExternalLastFixture
} from '@/lib/sport/wm-results-matcher';
import { WM_PICK_LEARNING_CHANGED_EVENT } from '@/lib/sport/wm-pick-learning-store';

interface Props {
  // Optional: externe finished Fixtures aus dem Liga-Pool. Server-Seite
  // reicht hier z. B. lf.last fuer eine FIFA-World-Cup-Liga durch.
  externalFinished?: ExternalLastFixture[];
}

export function WmPickResolver({ externalFinished = [] }: Props) {
  useEffect(() => {
    const run = () => {
      const manual = loadManualWmResults();
      const external = matchExternalResults(externalFinished);
      const merged = mergeResults(manual, external);
      if (merged.length === 0) return;
      const result = resolveAndPersistWmPicks(merged);
      if (result.resolvedCount > 0) {
        window.dispatchEvent(new CustomEvent(WM_PICK_LEARNING_CHANGED_EVENT));
      }
    };
    run();
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, run);
    return () => window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, run);
  }, [externalFinished]);

  return null;
}
