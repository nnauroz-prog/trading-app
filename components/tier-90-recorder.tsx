'use client';

import { useEffect } from 'react';
import { recordTier90Pick } from '@/lib/agents/tier-90-journal';

interface Props {
  qualified: boolean;
  date: string; // YYYY-MM-DD
  coinSymbol: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
}

// Client-only: schreibt jeden Tier-90-qualifizierten Pick einmalig ins
// lokale Tagebuch. Re-Render-resistent (recordTier90Pick prüft auf
// Duplikate via (date, coin)).
export function Tier90Recorder({ qualified, date, coinSymbol, entry, stopLoss, takeProfit1 }: Props) {
  useEffect(() => {
    if (!qualified || !coinSymbol) return;
    recordTier90Pick({ date, coinSymbol, entry, stopLoss, takeProfit1 });
  }, [qualified, date, coinSymbol, entry, stopLoss, takeProfit1]);
  return null;
}
