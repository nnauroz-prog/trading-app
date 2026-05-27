const HALVINGS: Array<{ event: string; date: string; price: number | null }> = [
  { event: '1st Halving', date: '2012-11-28', price: 12 },
  { event: '2nd Halving', date: '2016-07-09', price: 650 },
  { event: '3rd Halving', date: '2020-05-11', price: 8700 },
  { event: '4th Halving', date: '2024-04-20', price: 64000 }
];

const AVERAGE_HALVING_INTERVAL_DAYS = 1458;

export interface HalvingCyclePosition {
  lastHalvingDate: string;
  lastHalvingEvent: string;
  lastHalvingPriceUsd: number | null;
  nextEstimatedHalvingDate: string;
  daysSinceLastHalving: number;
  daysUntilNextHalving: number;
  cyclePct: number;
  phase: 'post-halving-rally' | 'bull-peak' | 'bear-cooldown' | 'pre-halving-accumulation';
  phaseLabel: string;
  phaseDescription: string;
  historicalContext: string;
}

function detectPhase(daysSinceHalving: number): { phase: HalvingCyclePosition['phase']; label: string; description: string } {
  if (daysSinceHalving < 365) {
    return {
      phase: 'post-halving-rally',
      label: 'Post-Halving-Rally-Phase',
      description: 'Historisch: 6-18 Monate nach Halving zeigt BTC die stärkste Performance des Zyklus. Bei den letzten 3 Halvings führte diese Phase zu neuen ATHs.'
    };
  }
  if (daysSinceHalving < 550) {
    return {
      phase: 'bull-peak',
      label: 'Bull-Peak-Phase',
      description: 'Historisch: 12-18 Monate nach Halving lag der Zyklus-Peak. Alt-Coins typischerweise hier am stärksten. Achtung: Distribution-Phase, Profit-Taking sinnvoll.'
    };
  }
  if (daysSinceHalving < 900) {
    return {
      phase: 'bear-cooldown',
      label: 'Bear-Cooldown-Phase',
      description: 'Historisch: 18-30 Monate nach Halving folgte ein -50 bis -80% Drawdown. Defensive Cash-Position oder DCA-Strategie.'
    };
  }
  return {
    phase: 'pre-halving-accumulation',
    label: 'Pre-Halving-Accumulation-Phase',
    description: 'Historisch: 30-48 Monate nach Halving war Akkumulations-Phase vor dem nächsten Halving. Niedrige Volatilität, Sentiment am Tiefpunkt.'
  };
}

function buildHistoricalContext(daysSinceHalving: number): string {
  if (daysSinceHalving < 365) {
    return 'Vergleich vorherige Zyklen Tag ' + daysSinceHalving + ': Halving 2020 = BTC ~10x; Halving 2016 = BTC ~3x; Halving 2012 = BTC ~30x. Vergangenheit ≠ Zukunft.';
  }
  if (daysSinceHalving < 550) {
    return 'Vergleich vorherige Zyklen: Bull-Peak war historisch ~Tag 365-545 nach Halving. ATHs lagen alle in dieser Phase.';
  }
  if (daysSinceHalving < 900) {
    return 'Vergleich vorherige Zyklen: Bear-Drawdown lag bei -53% (2018), -72% (2014-15) bzw. -77% (2022). Brutale Phase historisch.';
  }
  return 'Vergleich vorherige Zyklen: Akkumulations-Phase mit niedriger Volatilität. Sentiment-Tiefpunkte historisch hier.';
}

export function computeHalvingCyclePosition(): HalvingCyclePosition {
  const now = Date.now();
  const lastHalving = HALVINGS[HALVINGS.length - 1];
  const lastHalvingMs = new Date(lastHalving.date).getTime();
  const daysSince = Math.floor((now - lastHalvingMs) / (1000 * 60 * 60 * 24));
  const nextEstimatedMs = lastHalvingMs + AVERAGE_HALVING_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const daysUntil = Math.max(0, Math.floor((nextEstimatedMs - now) / (1000 * 60 * 60 * 24)));
  const cyclePct = Math.min(100, (daysSince / AVERAGE_HALVING_INTERVAL_DAYS) * 100);
  const phase = detectPhase(daysSince);

  return {
    lastHalvingDate: lastHalving.date,
    lastHalvingEvent: lastHalving.event,
    lastHalvingPriceUsd: lastHalving.price,
    nextEstimatedHalvingDate: new Date(nextEstimatedMs).toISOString().slice(0, 10),
    daysSinceLastHalving: daysSince,
    daysUntilNextHalving: daysUntil,
    cyclePct,
    phase: phase.phase,
    phaseLabel: phase.label,
    phaseDescription: phase.description,
    historicalContext: buildHistoricalContext(daysSince)
  };
}
