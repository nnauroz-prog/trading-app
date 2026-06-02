import type { SubAgentReport } from '@/lib/agents/sub-agents';

export type FirmaVoteDirection = 'kaufen' | 'warten' | 'mixed';

export interface FirmaVoteSummary {
  // Gesamtzahl der Sub-Agenten in dieser Firma
  total: number;
  // Wie viele zeigen positiv (Buy-tendenz)
  positiveVotes: number;
  // Wie viele zeigen negativ (Wait/Veto-tendenz)
  negativeVotes: number;
  // Neutral oder keine Daten
  neutralVotes: number;
  // Welche Richtung das Konsens-Ergebnis ist
  direction: FirmaVoteDirection;
  // 0..1 — Anteil der Positiv-Stimmen unter den nicht-neutralen
  confidence: number;
  // 0..1 — Gewichteter Konsens, wenn Skill-Daten verfügbar sind.
  // Wenn keine Hit-Raten übergeben werden, identisch zu confidence.
  skillWeightedConfidence: number;
}

// Skill-Multiplier basierend auf historischer Trefferquote (0..100).
// 50 % neutral = 1.0×; 60 % = 1.4×; 70 % = 1.8×; 40 % = 0.6×.
function skillWeight(hitRatePct: number | undefined): number {
  if (hitRatePct === undefined) return 1;
  return Math.max(0.1, Math.min(2.0, 1 + (hitRatePct - 50) / 25));
}

// Reduziert die heterogenen Sub-Agent-Reports auf eine einheitliche
// Plus/Minus/Neutral-Zählung. Damit kann ein Firma-Konsens-Pill gerendert werden
// analog zur Sport-Firma-Abstimmung.
// Optional: hitRates Map<role, hitRatePct> für skill-gewichteten Konsens.
export function summariseFirmaVotes(team: SubAgentReport[], hitRates?: Map<string, number>): FirmaVoteSummary {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let positiveWeight = 0;
  let negativeWeight = 0;
  for (const r of team) {
    const tone = r.voteTone;
    const skill = skillWeight(hitRates?.get(r.role));
    if (tone === 'good') { positive++; positiveWeight += skill; }
    else if (tone === 'bad') { negative++; negativeWeight += skill; }
    else neutral++;
  }
  const decisiveVotes = positive + negative;
  const decisiveWeight = positiveWeight + negativeWeight;
  const direction: FirmaVoteDirection =
    decisiveVotes === 0 ? 'mixed'
    : positive >= negative + 2 ? 'kaufen'
    : negative >= positive + 2 ? 'warten'
    : 'mixed';
  const confidence = decisiveVotes > 0 ? Math.max(positive, negative) / decisiveVotes : 0;
  const skillWeightedConfidence = decisiveWeight > 0 ? Math.max(positiveWeight, negativeWeight) / decisiveWeight : confidence;
  return {
    total: team.length,
    positiveVotes: positive,
    negativeVotes: negative,
    neutralVotes: neutral,
    direction,
    confidence,
    skillWeightedConfidence
  };
}
