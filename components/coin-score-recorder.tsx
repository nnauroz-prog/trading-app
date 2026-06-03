'use client';

import { useEffect } from 'react';
import { recordCoinScores } from '@/lib/coin-score-history';

interface CandidateInfo {
  coinId: string;
  symbol: string;
  passedCount: number;
}

// Tiny client-only hook component: writes today's confluence scores for every
// candidate the master signal returned. Runs once on mount, idempotent for the
// same day. Lives next to the watchlist so the trend strip can read from it.
export function CoinScoreRecorder({ date, candidates }: { date: string; candidates: CandidateInfo[] }) {
  useEffect(() => {
    if (candidates.length === 0) return;
    recordCoinScores(date, candidates.map((c) => ({ coinId: c.coinId, symbol: c.symbol, passedCount: c.passedCount })));
  }, [date, candidates]);
  return null;
}
