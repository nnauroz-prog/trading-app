// Potenzial der heute noch offenen Stakes.
//
// Fuer alle Stakes mit Spieldatum HEUTE, deren Pick noch pending ist:
//   - imRisikoEur: Summe der Einsaetze
//   - moeglicherGewinnEur: Summe stakeEur * (decimalOdds - 1) wenn
//     ALLE offenen Tipps treffen (best case, ehrlich so benannt)
//
// Reine Funktion. Keine I/O.

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';

export interface WmHeutePotenzial {
  offeneStakes: number;
  imRisikoEur: number;
  moeglicherGewinnEur: number;
}

export function computeWmHeutePotenzial(
  stakes: StakeRecord[],
  pickLog: WmPickLogEntry[],
  todayIso: string
): WmHeutePotenzial {
  const outcomeById = new Map(pickLog.map((e) => [e.id, e.outcome]));
  let offeneStakes = 0;
  let imRisikoEur = 0;
  let moeglicherGewinnEur = 0;
  for (const s of stakes) {
    if (s.dateIso !== todayIso) continue;
    const outcome = outcomeById.get(s.id) ?? 'pending';
    if (outcome !== 'pending') continue;
    offeneStakes += 1;
    imRisikoEur += s.stakeEur;
    moeglicherGewinnEur += s.stakeEur * (s.decimalOdds - 1);
  }
  return {
    offeneStakes,
    imRisikoEur: Math.round(imRisikoEur * 100) / 100,
    moeglicherGewinnEur: Math.round(moeglicherGewinnEur * 100) / 100
  };
}
