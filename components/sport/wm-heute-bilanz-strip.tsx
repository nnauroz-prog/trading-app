'use client';

// Heute-Bilanz-Strip im Heute-Bereich. Zeigt eine Zeile sobald heute
// mindestens ein Pick entschieden ist oder noch ein pending ist:
//   "heute 2/3 getroffen - netto +18.50 EUR" (gruen)
//   "heute 0/2 getroffen - netto -40.00 EUR" (rot)
//   "heute 1 Tipp offen" (sky-blau)
// Versteckt sich wenn es heute keine Picks gibt.

import { useEffect, useState } from 'react';
import { computeWmHeuteBilanz } from '@/lib/sport/wm-heute-bilanz';
import {
  loadWmPickLog,
  WM_PICK_LEARNING_CHANGED_EVENT
} from '@/lib/sport/wm-pick-learning-store';
import {
  loadStakeRecords,
  WM_BANKROLL_LEDGER_CHANGED_EVENT
} from '@/lib/sport/wm-bankroll-ledger-store';

interface Props {
  todayIso: string;
}

export function WmHeuteBilanzStrip({ todayIso }: Props) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
    window.addEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(WM_PICK_LEARNING_CHANGED_EVENT, refresh);
      window.removeEventListener(WM_BANKROLL_LEDGER_CHANGED_EVENT, refresh);
    };
  }, []);

  if (!mounted) return null;
  void tick;

  const bilanz = computeWmHeuteBilanz(loadWmPickLog(), loadStakeRecords(), todayIso);
  if (bilanz.pickCountHeute === 0) return null;

  const tone = bilanz.hasResolved
    ? bilanz.netPnlEur > 0
      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
      : bilanz.netPnlEur < 0
        ? 'border-rose-400/60 bg-rose-500/15 text-rose-100'
        : 'border-slate-600 bg-slate-900/40 text-slate-200'
    : 'border-sky-400/50 bg-sky-500/10 text-sky-100';

  return (
    <div className={`flex flex-wrap items-baseline gap-2 rounded-2xl border px-3 py-2 ${tone}`} aria-label="Heute-Bilanz">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Heute-Bilanz</span>
      <span className="text-[11.5px] font-bold">{bilanz.headline}</span>
      {bilanz.pending > 0 && bilanz.hasResolved && (
        <span className="text-[10.5px] opacity-90">· {bilanz.pending} noch offen</span>
      )}
      {bilanz.pushes > 0 && (
        <span className="text-[10.5px] opacity-90">· {bilanz.pushes} push</span>
      )}
    </div>
  );
}
