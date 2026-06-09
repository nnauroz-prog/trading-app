'use client';

// Zeigt die historische Treffer-Quote der User-eigenen Coin-Overrides.
// Jedes Mal wenn der User Veto / Conviction etc. gesetzt hat, wurde der
// Preis dieses Coins festgehalten. Nach mindestens 12 h und max 7 Tagen
// vergleichen wir mit dem aktuellen Preis und bewerten ob die User-
// Erwartung zutraf.
//
// Ehrlich versteckt wenn noch keine bewertbaren Outcomes vorliegen.

import { useEffect, useMemo, useState } from 'react';
import {
  COIN_OVERRIDE_HISTORY_CHANGED_EVENT,
  loadCoinOverrideHistory
} from '@/lib/agents/coin-override-history-store';
import {
  aggregateOutcomes,
  deriveUserOverrideWeight,
  evaluateOverrideOutcome,
  type CoinOverrideHistoryEntry,
  type OverrideOutcome
} from '@/lib/agents/coin-override-history';

interface Props {
  latestPrices: Record<string, number | null>;
}

function tone(rate: number | null): string {
  if (rate === null) return 'text-slate-300';
  if (rate >= 60) return 'text-emerald-300';
  if (rate >= 45) return 'text-slate-200';
  return 'text-rose-300';
}

export function UserOverrideAccuracyCard({ latestPrices }: Props) {
  const [history, setHistory] = useState<CoinOverrideHistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setHistory(loadCoinOverrideHistory());
    sync();
    setMounted(true);
    window.addEventListener(COIN_OVERRIDE_HISTORY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COIN_OVERRIDE_HISTORY_CHANGED_EVENT, sync);
  }, []);

  const outcomes = useMemo<OverrideOutcome[]>(() => {
    return history.map((e) => {
      const price = latestPrices[e.coinId] ?? null;
      return evaluateOverrideOutcome(e, price);
    });
  }, [history, latestPrices]);

  const acc = useMemo(() => aggregateOutcomes(outcomes), [outcomes]);
  const weight = useMemo(() => deriveUserOverrideWeight(acc), [acc]);

  if (!mounted) return null;
  if (acc.evaluable === 0) return null;

  const totalSet = history.length;
  const waiting = outcomes.filter((o) => o.outcome === 'too-young').length;

  return (
    <section className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-950/15 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Dein Override-Bauchgefuehl · Track-Record</h2>
        <span className="text-[10px] text-slate-400">{totalSet} Override{totalSet === 1 ? '' : 's'} geloggt</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Bewertet" value={String(acc.evaluable)} />
        <Stat label="Richtig" value={String(acc.correct)} tone="text-emerald-300" />
        <Stat label="Falsch" value={String(acc.wrong)} tone="text-rose-300" />
        <Stat label="Quote" value={acc.hitRatePct !== null ? `${acc.hitRatePct} %` : '—'} tone={tone(acc.hitRatePct)} />
      </div>

      {waiting > 0 && (
        <p className="text-[10px] text-slate-500">
          {waiting} weitere{waiting === 1 ? 'r' : ''} Override{waiting === 1 ? '' : 's'} bewertet sich frühestens nach 12 h.
        </p>
      )}

      {weight.reason !== 'insufficient' && weight.multiplier !== 1 && (
        <p className={`rounded border p-1.5 text-[10.5px] leading-snug ${weight.multiplier > 1 ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100' : 'border-amber-500/40 bg-amber-950/20 text-amber-100'}`}>
          ⚖ Aktive Gewichtung: {weight.label} Wirkt live auf jeden neuen Override (Hard-Veto bleibt ungewichtet).
        </p>
      )}
      {weight.reason === 'insufficient' && acc.evaluable >= 1 && (
        <p className="text-[10px] text-slate-500">
          Ab {weight.basedOnDecisive < 5 ? `${5 - weight.basedOnDecisive} weiteren bewerteten` : '5 bewerteten'} Overrides faengt das System an, Deinen Track-Record als Gewichtung zu nutzen.
        </p>
      )}

      {acc.byCoin.length >= 2 && (
        <details className="rounded border border-slate-800 bg-slate-950/40">
          <summary className="cursor-pointer p-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
            ▸ Per-Coin Aufschluesselung
          </summary>
          <ul className="space-y-0.5 p-1.5 pt-0">
            {acc.byCoin.map((c) => (
              <li key={c.coinId} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10.5px]">
                <span className="font-mono font-bold uppercase text-slate-200">{c.coinId}</span>
                <span className="text-slate-500">{c.correct}/{c.correct + c.wrong}</span>
                <span className={`font-mono font-bold ${tone(c.hitRatePct)}`}>
                  {c.hitRatePct !== null ? `${c.hitRatePct} %` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[10px] leading-snug text-slate-500">
        Ehrliche Selbstkontrolle: Veto/Distrust = User erwartete Fall; Conviction/Major-Event/Whale-Accumulate = erwartete Anstieg. Bewertet wird, ob der Coin-Preis im Fenster 12 h bis 7 Tage nach dem Set in die erwartete Richtung lief. Flat (|Aenderung| &lt; 1 %) zaehlt als unklar.
      </p>
    </section>
  );
}

function Stat({ label, value, tone = 'text-slate-200' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-1.5">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-base font-bold ${tone}`}>{value}</div>
    </div>
  );
}
