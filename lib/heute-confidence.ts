import { SetupSimilarity } from '@/lib/analysis/setup-similarity';
import { EventWindowState } from '@/lib/calendar/event-window';
import { IntelSignal } from '@/lib/intel/types';

export interface ConfidenceResult {
  score: number;
  label: string;
  toneClass: string;
}

// Compose a 0–100 confidence score for today's HEUTE block from five pillars:
// firma agreement (base), news tilt, historical hit rate of similar setups,
// imminent macro events, and the Recherche-Chefredakteur's net signal.
export function computeConfidence(
  buyCount: number,
  newsTilt: 'bullisch' | 'bärisch' | 'neutral' | 'none',
  similarity: SetupSimilarity | null,
  eventWindow: EventWindowState | null,
  intelSignal: IntelSignal | null
): ConfidenceResult {
  let score =
    buyCount === 3 ? 85 :
    buyCount === 2 ? 65 :
    buyCount === 1 ? 35 :
    10;

  if (newsTilt === 'bullisch') score += 5;
  else if (newsTilt === 'bärisch') score -= 10;

  if (similarity) {
    if (similarity.sampleSize === 'good' || similarity.sampleSize === 'ok') {
      if (similarity.hitRatePct !== null) {
        if (similarity.hitRatePct >= 60) score += 10;
        else if (similarity.hitRatePct >= 45) score += 3;
        else if (similarity.hitRatePct < 35) score -= 8;
      }
    } else if (similarity.sampleSize === 'too_small' || similarity.sampleSize === 'small') {
      score -= 5;
    }
  }

  if (eventWindow?.veryImminent) score -= 20;
  else if (eventWindow?.imminent) score -= 10;

  if (intelSignal === 'risk-on') score += 5;
  else if (intelSignal === 'risk-off') score -= 10;

  score = Math.max(0, Math.min(100, score));

  const label =
    score >= 75 ? 'hoch' :
    score >= 55 ? 'mittel' :
    score >= 35 ? 'niedrig' :
    'sehr niedrig';
  const toneClass =
    score >= 75 ? 'text-emerald-300' :
    score >= 55 ? 'text-amber-300' :
    'text-rose-300';
  return { score, label, toneClass };
}
