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
import {
  loadManualWmResults,
  WM_MANUAL_RESULTS_CHANGED_EVENT
} from '@/lib/sport/wm-results-store';
import {
  applyResultsToElo,
  collectResultsForElo,
  eloDeltaByTeam
} from '@/lib/sport/wm-dynamic-elo';
import { buildWmCalibrationFromLog, calibrationWarningFor } from '@/lib/sport/wm-calibration';
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
  const [manualTick, setManualTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setLog(loadWmPickLog());
    const syncManual = () => setManualTick((t) => t + 1);
    sync();
    setMounted(true);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
    window.addEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, syncManual);
    return () => {
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, sync);
      window.removeEventListener(WM_MANUAL_RESULTS_CHANGED_EVENT, syncManual);
    };
  }, []);

  const factorWeights = useMemo(() => deriveFactorWeights(log), [log]);

  // Dynamisches ELO aus resolved Picks + manuellen Ergebnissen — fliesst
  // als 'dynamic-elo' Faktor in die Pick-Neuberechnung ein.
  const dynamicElo = useMemo(() => {
    if (!mounted) return null;
    void manualTick;
    const results = collectResultsForElo(log, loadManualWmResults());
    if (results.length === 0) return null;
    return eloDeltaByTeam(applyResultsToElo(results));
  }, [mounted, log, manualTick]);

  const learnedPicks = useMemo(() => {
    const base = (() => {
      if (!mounted) return serverPicks;
      const hasWeights = factorWeights.totalResolved >= 5;
      const hasElo = dynamicElo !== null && Object.keys(dynamicElo).length > 0;
      if (!hasWeights && !hasElo) return serverPicks;
      // Sobald echte Resolved-Daten existieren, rechnen wir die Picks mit
      // Gewichten und/oder gelernten ELO-Deltas neu.
      return rankWmWinnerPicks({
        todayIso,
        horizonDays,
        factorWeights: hasWeights ? factorWeights : null,
        eloDeltaByTeam: dynamicElo ?? undefined
      });
    })();
    // Eigenkalibrierung: wenn das Probability-Bucket eines Picks in der
    // eigenen WM-Historie ueberschaetzt ist, haengen wir die Warnung an
    // die riskNotes — non-invasiv, der Pick bleibt sichtbar.
    if (!mounted) return base;
    const calibration = buildWmCalibrationFromLog(log);
    if (calibration.totalDecisive === 0) return base;
    return base.map((p) => {
      const warning = calibrationWarningFor(p.modelProbabilityPct, calibration);
      if (!warning) return p;
      return { ...p, riskNotes: [warning, ...p.riskNotes] };
    });
  }, [mounted, factorWeights, dynamicElo, serverPicks, todayIso, horizonDays, log]);

  return (
    <>
      <WmWinnerPicksCard picks={learnedPicks} todayIso={todayIso} horizonDays={horizonDays} />
      <WmPickLearningRecorder picks={learnedPicks} />
    </>
  );
}
