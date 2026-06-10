'use client';

// Client-Wrapper, der die Server-berechneten Roh-Picks mit den aktuell
// gelernten Faktor-Gewichten neu durchrechnet. Damit wirken die im Log
// gewachsenen BESTAETIGT/KONTRA-Gewichte sofort auf die Anzeige —
// ohne dass ein Server-Render notwendig ist.
//
// Strategie: wir nehmen die gleichen Inputs wie der Server (todayIso,
// horizon) und rufen rankWmWinnerPicks erneut auf, dieses Mal mit
// factorWeights aus dem Lern-Log. Das ist eine reine Berechnung, kein
// Netzwerk.

import { useEffect, useMemo, useState } from 'react';
import { rankWmWinnerPicks, type WmWinnerPick } from '@/lib/sport/wm-winner-picks';
import { deriveFactorWeights, type WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import { WmWinnerPicksCard } from '@/components/sport/wm-winner-picks-card';
import { WmPickLearningRecorder } from '@/components/sport/wm-pick-learning-recorder';

interface Props {
  // Server-Variante als Fallback (vor Hydration).
  serverPicks: WmWinnerPick[];
  todayIso: string;
  horizonDays: number;
}

export function WmWinnerPicksWithLearning({ serverPicks, todayIso, horizonDays }: Props) {
  const [log, setLog] = useState<WmPickLogEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadWmPickLog());
    sync();
    setMounted(true);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
  }, []);

  const factorWeights = useMemo(() => deriveFactorWeights(log), [log]);

  const learnedPicks = useMemo(() => {
    if (!mounted || factorWeights.totalResolved < 5) return serverPicks;
    // Nur wenn echte Resolved-Daten existieren, rechnen wir mit Gewichten neu.
    return rankWmWinnerPicks({ todayIso, horizonDays, factorWeights });
  }, [mounted, factorWeights, serverPicks, todayIso, horizonDays]);

  return (
    <>
      <WmWinnerPicksCard picks={learnedPicks} todayIso={todayIso} horizonDays={horizonDays} />
      <WmPickLearningRecorder picks={learnedPicks} />
    </>
  );
}
