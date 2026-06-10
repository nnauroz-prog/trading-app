'use client';

// Headless-Recorder: schreibt bei jedem Home-/Sport-Aufruf jeden aktuell
// angezeigten WM-Sieger-Pick (mit den dahinter liegenden Faktor-Werten)
// idempotent ins localStorage. Damit wachsen die Lern-Daten automatisch,
// ohne dass der User irgendwas anklicken muss.
//
// Rendert nichts sichtbar.

import { useEffect } from 'react';
import { recordWmPick } from '@/lib/sport/wm-pick-learning-store';
import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';
import type { WmFactorSnapshot } from '@/lib/sport/wm-pick-learning';

interface Props {
  picks: WmWinnerPick[];
}

function toSnapshot(pick: WmWinnerPick): WmFactorSnapshot[] {
  return pick.conditions.factors.map((f) => ({
    id: f.id,
    homeGoalMultiplier: f.homeGoalMultiplier,
    awayGoalMultiplier: f.awayGoalMultiplier,
    homeEloDelta: f.homeEloDelta,
    awayEloDelta: f.awayEloDelta,
    confidenceShift: f.confidenceShift
  }));
}

export function WmPickLearningRecorder({ picks }: Props) {
  useEffect(() => {
    if (picks.length === 0) return;
    for (const p of picks) {
      recordWmPick({
        id: `${p.fixture.id}-${p.winnerSide}`,
        fixtureId: p.fixture.id,
        dateIso: p.fixture.date,
        homeTeam: p.fixture.homeTeam,
        awayTeam: p.fixture.awayTeam,
        winnerTeam: p.winnerTeam,
        winnerSide: p.winnerSide,
        modelProbabilityPct: p.modelProbabilityPct,
        eloDiff: p.eloDiff,
        tier: p.tier,
        factorSnapshot: toSnapshot(p),
        proTipperConviction: p.proTipper.conviction
      });
    }
  }, [picks]);
  return null;
}
