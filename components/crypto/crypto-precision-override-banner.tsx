'use client';

// Zeigt unter dem Krypto Precision Desk, welche Verdicts durch User-Coin-
// Overrides gekippt werden. Der Desk selbst ist server-rendered und kennt
// die localStorage-Overrides nicht — dieses Banner schliesst die Luecke
// client-seitig und macht die Wirkung des eigenen Vetos sichtbar.
//
// Versteckt sich, wenn kein Override ein Verdict aendert oder annotiert.

import { useEffect, useMemo, useState } from 'react';
import {
  applyCoinAdjustment,
  type CoinOverride
} from '@/lib/agents/coin-override';
import {
  COIN_OVERRIDES_CHANGED_EVENT,
  loadAllCoinOverrides
} from '@/lib/agents/coin-override-store';
import {
  COIN_OVERRIDE_HISTORY_CHANGED_EVENT,
  loadCoinOverrideHistory
} from '@/lib/agents/coin-override-history-store';
import {
  aggregateOutcomes,
  deriveUserOverrideWeight,
  evaluateOverrideOutcome
} from '@/lib/agents/coin-override-history';
import {
  applyUserOverridesToAll,
  type OverrideAdjustedPick
} from '@/lib/analysis/crypto-precision-override';
import type { CryptoPrecisionVerdict } from '@/lib/analysis/crypto-precision-gate';

interface PickLite {
  coinId: string;
  symbol: string;
  verdict: CryptoPrecisionVerdict;
}

interface Props {
  picks: PickLite[];
  latestPrices: Record<string, number | null>;
}

const VERDICT_TEXT: Record<CryptoPrecisionVerdict, string> = {
  FREIGABE: 'FREIGABE',
  BEOBACHTEN: 'BEOBACHTEN',
  NICHT_VERWENDEN: 'NICHT VERWENDEN'
};

export function CryptoPrecisionOverrideBanner({ picks, latestPrices }: Props) {
  const [overrides, setOverrides] = useState<Record<string, CoinOverride>>({});
  const [historyTick, setHistoryTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setOverrides(loadAllCoinOverrides());
    const syncHistory = () => setHistoryTick((t) => t + 1);
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    window.addEventListener(COIN_OVERRIDE_HISTORY_CHANGED_EVENT, syncHistory);
    return () => {
      window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
      window.removeEventListener(COIN_OVERRIDE_HISTORY_CHANGED_EVENT, syncHistory);
    };
  }, []);

  // Track-Record-Gewicht des Users skaliert die Override-Auslenkung,
  // genau wie im CoinOverridePanel. Hard-Veto bleibt ungewichtet.
  const userWeight = useMemo(() => {
    void historyTick;
    const history = loadCoinOverrideHistory();
    const outcomes = history.map((e) => evaluateOverrideOutcome(e, latestPrices[e.coinId] ?? null));
    return deriveUserOverrideWeight(aggregateOutcomes(outcomes));
  }, [historyTick, latestPrices]);

  const adjusted = useMemo<OverrideAdjustedPick[]>(() => {
    return applyUserOverridesToAll(picks, (coinId) => {
      const ov = overrides[coinId.toLowerCase()] ?? null;
      if (!ov) return null;
      return applyCoinAdjustment(ov, userWeight.multiplier);
    });
  }, [picks, overrides, userWeight]);

  if (!mounted) return null;

  const flips = adjusted.filter((a) => a.changed);
  const notes = adjusted.filter((a) => !a.changed && a.convictionNote);
  if (flips.length === 0 && notes.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-amber-400/40 bg-amber-950/15 p-3" aria-label="User-Override-Wirkung auf Precision Desk">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Deine Overrides wirken auf den Desk</h3>

      {flips.length > 0 && (
        <ul className="space-y-1">
          {flips.map((f) => (
            <li key={f.coinId} className="rounded border border-rose-500/40 bg-rose-950/20 px-2 py-1.5 text-[11px] text-rose-100">
              <span className="font-mono font-bold">{f.symbol}</span>
              <span className="mx-1.5 opacity-70">{VERDICT_TEXT[f.originalVerdict]} →</span>
              <span className="font-bold">{VERDICT_TEXT[f.adjustedVerdict]}</span>
              <span className="block text-[10px] leading-snug opacity-80">{f.reason}</span>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.coinId} className="rounded border border-sky-500/30 bg-sky-950/15 px-2 py-1.5 text-[10.5px] leading-snug text-sky-100">
              <span className="font-mono font-bold">{n.symbol}</span>: {n.convictionNote}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] leading-snug text-amber-100/60">
        Hard-Veto kippt jedes Verdict. Starkes Misstrauen (Delta ≤ -15) stuft FREIGABE auf BEOBACHTEN herab. Conviction kann nie auf FREIGABE hochstufen — die Pflicht-Kriterien des Modells bleiben unverhandelbar.
        {userWeight.reason !== 'insufficient' && userWeight.multiplier !== 1 && ` Dein Track-Record gewichtet die Auslenkung mit ${userWeight.multiplier}×.`}
      </p>
    </section>
  );
}
