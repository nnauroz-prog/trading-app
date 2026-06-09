'use client';

// Pro-Coin-Panel auf der Asset-Detail-Seite: User markiert Faktoren, die
// das Modell nicht sieht (Unlocks, ETF-Entscheidungen, Whale-Bewegungen,
// regulatorische Unsicherheit, persoenliches Misstrauen / Conviction).
// Live-Anzeige des adjustierten Safety-Score Delta.

import { useEffect, useState } from 'react';
import {
  applyCoinAdjustment,
  COIN_FACTOR_META,
  type CoinOverrideFactor
} from '@/lib/agents/coin-override';
import {
  COIN_OVERRIDES_CHANGED_EVENT,
  loadCoinOverride,
  setCoinOverride
} from '@/lib/agents/coin-override-store';

interface Props {
  coinId: string;
  symbol: string;
  baseSafetyScore: number; // 0-100, vor User-Override
  // Optional: aktueller Coin-Preis. Wenn gesetzt, werden Override-Aenderungen
  // mit Preis-Anker ins History-Log geschrieben, sodass spaeter eine
  // Hit-Rate-Bewertung moeglich ist.
  currentPrice?: number | null;
}

const FACTOR_ORDER: CoinOverrideFactor[] = [
  'major-event-today',
  'whale-accumulating',
  'manual-conviction',
  'whale-selling-visible',
  'regulatory-uncertainty',
  'large-unlock-today',
  'manual-distrust'
];

export function CoinOverridePanel({ coinId, symbol, baseSafetyScore, currentPrice }: Props) {
  const [selected, setSelected] = useState<CoinOverrideFactor[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const ov = loadCoinOverride(coinId);
      setSelected(ov?.factors ?? []);
    };
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
  }, [coinId]);

  const adj = applyCoinAdjustment(
    mounted && selected.length > 0
      ? { coinId, factors: selected, updatedAt: 0 }
      : null
  );

  if (!mounted) return null;

  const toggle = (f: CoinOverrideFactor) => {
    const next = selected.includes(f)
      ? selected.filter((x) => x !== f)
      : [...selected, f];
    setSelected(next);
    setCoinOverride(coinId, next, currentPrice);
  };

  const adjustedScore = Math.max(0, Math.min(100, baseSafetyScore + adj.scoreDelta));

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5" aria-label="Coin-Faktoren-Override">
      <header>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faktoren, die das Modell nicht sieht</h2>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Markiere, was Du ueber {symbol} weisst — Unlocks, ETF, Whale-Bewegungen, regulatorische Vorboten, persoenliche Conviction. Die Safety-Bewertung wird live angepasst (Cap ±25 Punkte). Bei &bdquo;Token-Unlock heute&ldquo; oder &bdquo;Manuelles Misstrauen&ldquo; gibt es zusaetzlich ein hartes Veto.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        {FACTOR_ORDER.map((f) => {
          const meta = COIN_FACTOR_META[f];
          const checked = selected.includes(f);
          return (
            <li key={f}>
              <label className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-[11px] leading-snug hover:bg-slate-900/60 ${checked ? 'border-amber-400/50 bg-amber-950/15 text-slate-100' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(f)}
                  className="mt-0.5 accent-amber-400"
                />
                <span>
                  <span aria-hidden className="mr-1">{meta.emoji}</span>
                  <span className="font-semibold">{meta.label}</span>
                  <span className="block text-[10px] text-slate-500">{meta.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <div className="rounded-md border border-amber-400/40 bg-amber-950/15 p-2.5 text-[11.5px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Adjustierte Bewertung</span>
            <span className="text-[10px] text-slate-500">{adj.factors.length} Faktor{adj.factors.length === 1 ? '' : 'en'} aktiv</span>
          </div>
          <div className="mt-1 grid grid-cols-3 items-baseline gap-2 text-center">
            <div>
              <div className="text-[8.5px] uppercase tracking-wider text-slate-500">Score Original</div>
              <div className="font-mono text-base font-bold text-slate-200">{baseSafetyScore}</div>
            </div>
            <div>
              <div className="text-[8.5px] uppercase tracking-wider text-slate-500">Delta</div>
              <div className={`font-mono text-base font-bold ${adj.scoreDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {adj.scoreDelta >= 0 ? '+' : ''}{adj.scoreDelta}
                {adj.capped && <span className="ml-1 text-[9px] text-amber-400">(cap)</span>}
              </div>
            </div>
            <div>
              <div className="text-[8.5px] uppercase tracking-wider text-slate-500">Score Adjustiert</div>
              <div className={`font-mono text-base font-bold ${adjustedScore >= baseSafetyScore ? 'text-emerald-300' : 'text-rose-300'}`}>
                {adjustedScore}
              </div>
            </div>
          </div>
          {adj.hardVeto && (
            <p className="mt-1.5 rounded border border-rose-500/50 bg-rose-950/30 p-1.5 text-[10.5px] leading-snug text-rose-100">
              ⚠ Hartes Veto aktiv: bei &bdquo;Token-Unlock heute&ldquo; oder &bdquo;Manuelles Misstrauen&ldquo; geht die Empfehlung sicherheitshalber auf WATCH-only.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setSelected([]);
              setCoinOverride(coinId, [], currentPrice);
            }}
            className="mt-2 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
          >
            Alle zuruecksetzen
          </button>
        </div>
      )}
    </section>
  );
}
