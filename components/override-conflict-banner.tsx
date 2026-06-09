'use client';

// Konflikt-Banner: wenn die App-Empfehlungen (Vorstand-Verdict, KryptoCard,
// TradingTodayCard) einen Coin nennen, auf dem der User selbst einen Override
// gesetzt hat, der dem widerspricht — zeige das prominent. So uebersieht der
// User seinen eigenen Input nicht.

import { useEffect, useState } from 'react';
import {
  COIN_OVERRIDES_CHANGED_EVENT,
  loadAllCoinOverrides as loadAllCoinOverridesFromStore,
  loadCoinOverride
} from '@/lib/agents/coin-override-store';
import { applyCoinAdjustment, type CoinOverride } from '@/lib/agents/coin-override';

interface Props {
  // Coins, die heute irgendwo auf der Home als Empfehlung auftauchen.
  // Format: lowercased Symbol/CoinId (BTC, ETH, SOL etc.).
  recommendedCoins: string[];
}

type ConflictKind = 'veto-vs-rec' | 'distrust-vs-rec' | 'conviction-no-rec';

interface Conflict {
  coinId: string;
  scoreDelta: number;
  hardVeto: boolean;
  factorCount: number;
  kind: ConflictKind;
}

export function OverrideConflictBanner({ recommendedCoins }: Props) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const found: Conflict[] = [];
      const recSet = new Set(recommendedCoins.map((c) => c.toLowerCase()));
      // Pass 1: Empfohlene Coins, auf denen der User Veto/Misstrauen gesetzt hat.
      for (const coin of recSet) {
        const ov: CoinOverride | null = loadCoinOverride(coin);
        if (!ov || ov.factors.length === 0) continue;
        const adj = applyCoinAdjustment(ov);
        if (adj.hardVeto) {
          found.push({ coinId: coin, scoreDelta: adj.scoreDelta, hardVeto: true, factorCount: ov.factors.length, kind: 'veto-vs-rec' });
        } else if (adj.scoreDelta <= -8) {
          found.push({ coinId: coin, scoreDelta: adj.scoreDelta, hardVeto: false, factorCount: ov.factors.length, kind: 'distrust-vs-rec' });
        }
      }
      // Pass 2: Coins, auf denen der User Conviction (+8 oder mehr) gesetzt hat,
      // aber KEINE Firma die als Empfehlung fuehrt. „User-zu-optimistisch"-Fall.
      const allOverrides = Object.keys(loadAllCoinOverridesFromStore());
      for (const coin of allOverrides) {
        if (recSet.has(coin)) continue;
        const ov = loadCoinOverride(coin);
        if (!ov || ov.factors.length === 0) continue;
        const adj = applyCoinAdjustment(ov);
        if (adj.scoreDelta >= 8 && !adj.hardVeto) {
          found.push({ coinId: coin, scoreDelta: adj.scoreDelta, hardVeto: false, factorCount: ov.factors.length, kind: 'conviction-no-rec' });
        }
      }
      // Sort: Vetos zuerst, dann Distrust, dann Conviction-Solo.
      const rank = (k: ConflictKind) => k === 'veto-vs-rec' ? 0 : k === 'distrust-vs-rec' ? 1 : 2;
      found.sort((a, b) => rank(a.kind) - rank(b.kind) || a.scoreDelta - b.scoreDelta);
      setConflicts(found);
    };
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
  }, [recommendedCoins]);

  if (!mounted || conflicts.length === 0) return null;

  const hasVeto = conflicts.some((c) => c.hardVeto);
  const hasOnlyConviction = conflicts.every((c) => c.kind === 'conviction-no-rec');

  return (
    <section
      className={`space-y-2 rounded-2xl border-2 p-4 ${
        hasVeto
          ? 'border-rose-500/60 bg-rose-950/30'
          : hasOnlyConviction
          ? 'border-sky-400/40 bg-sky-950/20'
          : 'border-amber-400/50 bg-amber-950/20'
      }`}
      aria-label="User-Override-Konflikt"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${hasVeto ? 'text-rose-300' : hasOnlyConviction ? 'text-sky-300' : 'text-amber-300'}`}>
          {hasOnlyConviction ? 'Deine Conviction ohne Firma-Rueckhalt' : 'Konflikt zwischen Empfehlung und deinem Override'}
        </span>
        <span className="text-[10px] text-slate-400">{conflicts.length} Coin{conflicts.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="space-y-1">
        {conflicts.map((c) => {
          let title: React.ReactNode;
          let advice: string;
          if (c.kind === 'veto-vs-rec') {
            title = <><span className="font-mono font-bold uppercase">{c.coinId}</span> ist heute Empfehlung — <span className="font-semibold">aber Du hast ein hartes Veto gesetzt.</span></>;
            advice = 'Folge deinem Veto — die Empfehlung ignoriert offene Risiken (Token-Unlock / Misstrauen), die Du markiert hast.';
          } else if (c.kind === 'distrust-vs-rec') {
            title = <><span className="font-mono font-bold uppercase">{c.coinId}</span> ist heute Empfehlung — <span className="font-semibold">Du hast die Safety um {c.scoreDelta} Punkte heruntergestuft.</span></>;
            advice = 'Position kleiner sizen als die Empfehlung suggeriert, Stop strikt einhalten.';
          } else {
            title = <><span className="font-mono font-bold uppercase">{c.coinId}</span> hast Du um +{c.scoreDelta} Punkte hochgestuft — <span className="font-semibold">aber keine Firma kauft den Coin heute.</span></>;
            advice = 'Deine Conviction hat keinen Firma-Rueckhalt. Wenn Du trotzdem rein willst: Position bewusst kleiner, Stop enger, kein Nachkaufen.';
          }
          return (
            <li key={c.coinId} className="rounded-md border border-slate-800/60 bg-slate-950/40 p-2 text-[11.5px] leading-snug text-slate-100">
              <div className="flex items-baseline justify-between gap-2">
                <span>{title}</span>
                <span className="font-mono text-[10px] text-slate-400">{c.factorCount} Faktor{c.factorCount === 1 ? '' : 'en'}</span>
              </div>
              <p className="mt-0.5 text-[10.5px] text-slate-400">{advice}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
