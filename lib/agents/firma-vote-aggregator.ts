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
}

// Reduziert die heterogenen Sub-Agent-Reports auf eine einheitliche
// Plus/Minus/Neutral-Zählung. Damit kann ein Firma-Konsens-Pill gerendert werden
// analog zur Sport-Firma-Abstimmung.
export function summariseFirmaVotes(team: SubAgentReport[]): FirmaVoteSummary {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const r of team) {
    const tone = r.voteTone;
    if (tone === 'positive') positive++;
    else if (tone === 'negative') negative++;
    else neutral++;
  }
  const decisiveVotes = positive + negative;
  const direction: FirmaVoteDirection =
    decisiveVotes === 0 ? 'mixed'
    : positive >= negative + 2 ? 'kaufen'
    : negative >= positive + 2 ? 'warten'
    : 'mixed';
  const confidence = decisiveVotes > 0 ? Math.max(positive, negative) / decisiveVotes : 0;
  return {
    total: team.length,
    positiveVotes: positive,
    negativeVotes: negative,
    neutralVotes: neutral,
    direction,
    confidence
  };
}
