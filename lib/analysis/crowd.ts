export type CrowdState = 'greed' | 'fear' | 'neutral';

export interface CrowdAssessment {
  state: CrowdState;
  cautious: boolean; // overcrowded longs -> contrarian caution
  detail: string;
}

export const NEUTRAL_CROWD: CrowdAssessment = {
  state: 'neutral',
  cautious: false,
  detail: 'Marktstimmung neutral.'
};

// Contrarian read of the crowd: extreme greed (especially with expensive,
// long-heavy funding) means the long side is crowded and a pullback is more
// likely — a pro gets cautious exactly when everyone is euphoric. Extreme fear
// is the opposite (potential opportunity), never a reason to hold back.
export function assessCrowd(fearGreed: number | null, fundingAnnualizedPct: number | null): CrowdAssessment {
  if (fearGreed === null) return NEUTRAL_CROWD;

  const state: CrowdState = fearGreed >= 75 ? 'greed' : fearGreed <= 25 ? 'fear' : 'neutral';
  const crowdedLongs = fundingAnnualizedPct !== null && fundingAnnualizedPct > 30;
  const cautious = fearGreed >= 80 || (fearGreed >= 70 && crowdedLongs);

  let detail: string;
  if (cautious) {
    detail = `Extreme Gier (Angst/Gier-Index ${fearGreed})${crowdedLongs ? ' und überfüllte Long-Seite (teure Funding-Rate)' : ''} — antizyklisch vorsichtig, nicht mit der Euphorie kaufen.`;
  } else if (state === 'fear') {
    detail = `Angst im Markt (Index ${fearGreed}) — oft bessere Einstiege als bei Euphorie, kein Grund zur Zurückhaltung.`;
  } else if (state === 'greed') {
    detail = `Leichte Gier (Index ${fearGreed}) — noch okay, aber nicht überdrehen.`;
  } else {
    detail = `Marktstimmung neutral (Index ${fearGreed}).`;
  }

  return { state, cautious, detail };
}
