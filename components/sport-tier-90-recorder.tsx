'use client';

import { useEffect } from 'react';
import { recordSportTier90 } from '@/lib/sport/sport-tier-90-journal';
import type { ConsensusVerdict } from '@/lib/sport/firma/consensus';
import type { UpcomingFixture } from '@/lib/sport/fetcher';

interface Props {
  picks: { verdict: ConsensusVerdict; fixture: UpcomingFixture; leagueName: string }[];
}

// Schreibt jeden Tier-90-qualifizierten Sport-Pick einmal ins lokale
// Tagebuch (Duplikat-resistant per fixtureId).
export function SportTier90Recorder({ picks }: Props) {
  useEffect(() => {
    for (const p of picks) {
      if (!p.verdict.tier90) continue;
      const score = p.fixture.prediction?.likelyScore;
      recordSportTier90({
        fixtureId: p.fixture.id,
        date: p.fixture.date,
        homeTeam: p.fixture.homeTeam,
        awayTeam: p.fixture.awayTeam,
        league: p.leagueName,
        pickPlain: p.verdict.pickPlain,
        pickSide: p.verdict.pickSide === 'draw' ? 'draw' : p.verdict.pickSide,
        confidence: p.verdict.consensusScore / 100,
        likelyScoreHome: score?.home ?? 0,
        likelyScoreAway: score?.away ?? 0
      });
    }
  }, [picks]);
  return null;
}
