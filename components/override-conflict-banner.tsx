'use client';

// Konflikt-Banner: wenn die App-Empfehlungen (Vorstand-Verdict, KryptoCard,
// TradingTodayCard) einen Coin nennen, auf dem der User selbst einen Override
// gesetzt hat, der dem widerspricht — zeige das prominent. So uebersieht der
// User seinen eigenen Input nicht.

import { useEffect, useState } from 'react';
import {
  COIN_OVERRIDES_CHANGED_EVENT,
  loadCoinOverride
} from '@/lib/agents/coin-override-store';
import { applyCoinAdjustment, type CoinOverride } from '@/lib/agents/coin-override';

interface Props {
  // Coins, die heute irgendwo auf der Home als Empfehlung auftauchen.
  // Format: lowercased Symbol/CoinId (BTC, ETH, SOL etc.).
  recommendedCoins: string[];
}

interface Conflict {
  coinId: string;
  scoreDelta: number;
  hardVeto: boolean;
  factorCount: number;
}

export function OverrideConflictBanner({ recommendedCoins }: Props) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const found: Conflict[] = [];
      for (const coin of recommendedCoins) {
        const ov: CoinOverride | null = loadCoinOverride(coin);
        if (!ov || ov.factors.length === 0) continue;
        const adj = applyCoinAdjustment(ov);
        // Konflikt = hardVeto ODER deutlich negativer Delta (≤ -8).
        if (adj.hardVeto || adj.scoreDelta <= -8) {
          found.push({
            coinId: coin,
            scoreDelta: adj.scoreDelta,
            hardVeto: adj.hardVeto,
            factorCount: ov.factors.length
          });
        }
      }
      // Vetos zuerst.
      found.sort((a, b) => (b.hardVeto ? 1 : 0) - (a.hardVeto ? 1 : 0) || a.scoreDelta - b.scoreDelta);
      setConflicts(found);
    };
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
  }, [recommendedCoins]);

  if (!mounted || conflicts.length === 0) return null;

  const hasVeto = conflicts.some((c) => c.hardVeto);

  return (
    <section
      className={`space-y-2 rounded-2xl border-2 p-4 ${
        hasVeto
          ? 'border-rose-500/60 bg-rose-950/30'
          : 'border-amber-400/50 bg-amber-950/20'
      }`}
      aria-label="User-Override-Konflikt"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${hasVeto ? 'text-rose-300' : 'text-amber-300'}`}>
          Konflikt zwischen Empfehlung und deinem Override
        </span>
        <span className="text-[10px] text-slate-400">{conflicts.length} Coin{conflicts.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="space-y-1">
        {conflicts.map((c) => (
          <li key={c.coinId} className="rounded-md border border-slate-800/60 bg-slate-950/40 p-2 text-[11.5px] leading-snug text-slate-100">
            <div className="flex items-baseline justify-between gap-2">
              <span>
                <span className="font-mono font-bold uppercase">{c.coinId}</span> ist heute Empfehlung —
                <span className="ml-1 font-semibold">
                  {c.hardVeto ? 'aber Du hast ein hartes Veto gesetzt.' : `Du hast die Safety um ${c.scoreDelta} Punkte heruntergestuft.`}
                </span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{c.factorCount} Faktor{c.factorCount === 1 ? '' : 'en'}</span>
            </div>
            <p className="mt-0.5 text-[10.5px] text-slate-400">
              {c.hardVeto
                ? 'Folge deinem Veto — die Empfehlung ignoriert offene Risiken (Token-Unlock / Misstrauen), die Du markiert hast.'
                : 'Position kleiner sizen als die Empfehlung suggeriert, Stop strikt einhalten.'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
