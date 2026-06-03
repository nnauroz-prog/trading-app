'use client';

import { useEffect } from 'react';
import { TIER_90_JOURNAL_CHANGED_EVENT, loadTier90Journal, resolveTier90Pick } from '@/lib/agents/tier-90-journal';

interface Props {
  // coinSymbol (upper-case) → aktueller Spot-Preis
  latestPrices: Record<string, number>;
}

const STORAGE_KEY = 'trading-app.tier-90-journal-v1';

// Client-only Auto-Auflöser. Iteriert pending Picks aus dem Tagebuch und
// vergleicht mit dem aktuellen Spot-Preis: wenn unter Stop → stop_hit, wenn
// über Take-Profit → tp_hit. Approximation (kein echtes Tages-Hoch/Tief), aber
// gut genug für ein selbst-pflegendes Tagebuch.
export function Tier90Resolver({ latestPrices }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const log = loadTier90Journal();
    if (log.length === 0) return;
    let changed = false;
    const updated = log.map((e) => {
      if (e.outcome !== 'pending') return e;
      const price = latestPrices[e.coinSymbol.toUpperCase()];
      if (!Number.isFinite(price)) return e;
      // Approximation: current price ist gleichzeitig high und low.
      const resolved = resolveTier90Pick(e, price, price);
      if (resolved.outcome !== e.outcome) changed = true;
      return resolved;
    });
    if (changed) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(TIER_90_JOURNAL_CHANGED_EVENT));
    }
  }, [latestPrices]);
  return null;
}
