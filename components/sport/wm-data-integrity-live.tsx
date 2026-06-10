'use client';

// Live-Wrapper fuer den Daten-Integritaets-Agent.
//
// Startet beim Mount eine Selbst-Auffrischung alle 30 s. Der Agent
// ist reine Pure-Function — also kein Netzwerk-Aufwand, nur ein neuer
// Audit-Lauf. Das ergibt:
//   - Live-Zeitstempel "vor X Sekunden"
//   - Wenn der User wahrend des Lesens etwas in localStorage aendert
//     (z. B. via Settings), wird der Audit neu evaluiert.

import { useEffect, useState } from 'react';
import { evaluateIntegrityAction, type IntegrityAction } from '@/lib/sport/wm-data-integrity-action';
import { WmDataIntegrityCard } from '@/components/sport/wm-data-integrity-card';

interface Props {
  initial: IntegrityAction;
}

const REFRESH_MS = 30_000;

export function WmDataIntegrityLive({ initial }: Props) {
  const [action, setAction] = useState<IntegrityAction>(initial);

  useEffect(() => {
    const tick = () => setAction(evaluateIntegrityAction());
    const id = setInterval(tick, REFRESH_MS);
    // Sofort nach Mount neu evaluieren (Hydration-Drift).
    tick();
    return () => clearInterval(id);
  }, []);

  return (
    <WmDataIntegrityCard
      issues={action.issues}
      generatedAt={action.generatedAt}
      activeBlocks={action.activeBlocks}
    />
  );
}
