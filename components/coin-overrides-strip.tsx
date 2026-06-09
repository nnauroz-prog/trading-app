'use client';

// Kompakter Strip auf der Home: zeigt alle aktiven Coin-User-Overrides
// auf einen Blick. Ehrlich versteckt, wenn der User keine gesetzt hat.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  COIN_OVERRIDES_CHANGED_EVENT,
  loadAllCoinOverrides
} from '@/lib/agents/coin-override-store';
import { applyCoinAdjustment, type CoinOverride } from '@/lib/agents/coin-override';

interface Row {
  coinId: string;
  factorCount: number;
  scoreDelta: number;
  hardVeto: boolean;
  capped: boolean;
}

export function CoinOverridesStrip() {
  const [rows, setRows] = useState<Row[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const all = loadAllCoinOverrides();
      const list: Row[] = [];
      for (const [coinId, ov] of Object.entries(all)) {
        const o = ov as CoinOverride;
        if (o.factors.length === 0) continue;
        const adj = applyCoinAdjustment(o);
        list.push({
          coinId,
          factorCount: o.factors.length,
          scoreDelta: adj.scoreDelta,
          hardVeto: adj.hardVeto,
          capped: adj.capped
        });
      }
      // Veto first, dann nach abs(Delta) sortiert.
      list.sort((a, b) => {
        if (a.hardVeto !== b.hardVeto) return a.hardVeto ? -1 : 1;
        return Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta);
      });
      setRows(list);
    };
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COIN_OVERRIDES_CHANGED_EVENT, sync);
  }, []);

  if (!mounted) return null;
  if (rows.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-950/15 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
          Deine aktiven Coin-Faktoren
        </h2>
        <span className="text-[9.5px] text-amber-200/70">
          {rows.length} Coin{rows.length === 1 ? '' : 's'} mit User-Override
        </span>
      </div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.coinId}>
            <Link
              href={`/assets/${r.coinId.toLowerCase()}`}
              className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2 rounded-md border border-amber-400/30 bg-amber-950/10 px-2 py-1 text-[11px] hover:border-amber-400/60"
            >
              <span className="font-mono font-bold uppercase text-amber-200">{r.coinId}</span>
              <span className="text-[10px] text-amber-100/70">{r.factorCount} Faktor{r.factorCount === 1 ? '' : 'en'}</span>
              <span className={`font-mono text-[10px] font-bold ${r.scoreDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {r.scoreDelta >= 0 ? '+' : ''}{r.scoreDelta} pt{r.capped && '*'}
              </span>
              {r.hardVeto && (
                <span className="rounded border border-rose-500/50 bg-rose-500/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200">
                  Veto
                </span>
              )}
              {!r.hardVeto && <span />}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[9.5px] leading-snug text-amber-100/60">
        Klicke einen Coin an, um die Faktoren zu bearbeiten. Veto = bei &bdquo;Token-Unlock&ldquo; oder &bdquo;Manuelles Misstrauen&ldquo; geht die Empfehlung auf WATCH-only.
      </p>
    </section>
  );
}
