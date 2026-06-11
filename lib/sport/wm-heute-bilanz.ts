// Heute-Bilanz: was an heutigen Picks schon entschieden ist + Netto-PnL
// aus dem Ledger (sofern Stakes uebernommen wurden).
//
// Reine Funktion. Input bekommt der Caller (Client liest aus Stores).

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';
import { pnlForOutcome } from '@/lib/sport/wm-bankroll-ledger';

export interface WmHeuteBilanz {
  pickCountHeute: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  netPnlEur: number;
  hasResolved: boolean;
  headline: string; // "heute 2/3 getroffen - netto +18.50 EUR"
}

export function computeWmHeuteBilanz(
  pickLog: WmPickLogEntry[],
  stakes: StakeRecord[],
  todayIso: string
): WmHeuteBilanz {
  const heute = pickLog.filter((e) => e.dateIso === todayIso);
  const stakeById = new Map(stakes.map((s) => [s.id, s]));
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;
  let netPnlEur = 0;
  for (const e of heute) {
    if (e.outcome === 'win') wins += 1;
    else if (e.outcome === 'loss') losses += 1;
    else if (e.outcome === 'push') pushes += 1;
    else { pending += 1; continue; }
    const s = stakeById.get(e.id);
    if (s) {
      const pnl = pnlForOutcome(e.outcome, s.stakeEur, s.decimalOdds);
      if (pnl !== null) netPnlEur += pnl;
    }
  }
  netPnlEur = Math.round(netPnlEur * 100) / 100;
  const decided = wins + losses;
  const hasResolved = decided + pushes > 0;
  const pickCountHeute = heute.length;
  let headline = `heute ${pickCountHeute} Tipp${pickCountHeute === 1 ? '' : 's'}`;
  if (decided > 0) {
    headline = `heute ${wins}/${decided} getroffen`;
    if (netPnlEur !== 0) {
      headline += ` — netto ${netPnlEur >= 0 ? '+' : ''}${netPnlEur.toFixed(2)} EUR`;
    }
  } else if (pending > 0) {
    headline = `heute ${pending} Tipp${pending === 1 ? '' : 's'} offen`;
  }
  return {
    pickCountHeute,
    wins,
    losses,
    pushes,
    pending,
    netPnlEur,
    hasResolved,
    headline
  };
}
