// Tages-PnL-Verlauf der letzten N Tage. Reine Funktion.
//
// Pro Tag: Summe der PnL der an diesem Tag entschiedenen Stakes.
// Liefert dates[] + pnlPerDay[] + cumulativePnl[] (Equity-Kurve).

import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';
import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';
import { pnlForOutcome } from '@/lib/sport/wm-bankroll-ledger';

export interface WmRoiVerlauf {
  fromIso: string;
  toIso: string;
  dates: string[];
  pnlPerDay: number[];
  cumulativePnl: number[];
  // Pro Tier getrennt: Hoechste Konfluenz vs. Modell-Favorit.
  cumulativeHoechsteKonfluenz: number[];
  cumulativeModellFavorit: number[];
  totalPnl: number;
  totalHoechsteKonfluenz: number;
  totalModellFavorit: number;
  hasData: boolean;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildWmRoiVerlauf(
  pickLog: WmPickLogEntry[],
  stakes: StakeRecord[],
  todayIso: string,
  windowDays = 14
): WmRoiVerlauf {
  const fromIso = addDays(todayIso, -(windowDays - 1));
  const stakeById = new Map(stakes.map((s) => [s.id, s]));
  const pnlByDate = new Map<string, number>();
  const pnlByDateHoechste = new Map<string, number>();
  const pnlByDateModell = new Map<string, number>();
  for (const e of pickLog) {
    if (e.outcome === 'pending') continue;
    if (e.dateIso < fromIso || e.dateIso > todayIso) continue;
    const s = stakeById.get(e.id);
    if (!s) continue;
    const pnl = pnlForOutcome(e.outcome, s.stakeEur, s.decimalOdds);
    if (pnl === null) continue;
    pnlByDate.set(e.dateIso, (pnlByDate.get(e.dateIso) ?? 0) + pnl);
    if (e.tier === 'hoechste-konfluenz') {
      pnlByDateHoechste.set(e.dateIso, (pnlByDateHoechste.get(e.dateIso) ?? 0) + pnl);
    } else {
      pnlByDateModell.set(e.dateIso, (pnlByDateModell.get(e.dateIso) ?? 0) + pnl);
    }
  }
  const dates: string[] = [];
  const pnlPerDay: number[] = [];
  const cumulativePnl: number[] = [];
  const cumulativeHoechsteKonfluenz: number[] = [];
  const cumulativeModellFavorit: number[] = [];
  let running = 0;
  let runningH = 0;
  let runningM = 0;
  for (let i = 0; i < windowDays; i++) {
    const iso = addDays(fromIso, i);
    const p = Math.round((pnlByDate.get(iso) ?? 0) * 100) / 100;
    const pH = Math.round((pnlByDateHoechste.get(iso) ?? 0) * 100) / 100;
    const pM = Math.round((pnlByDateModell.get(iso) ?? 0) * 100) / 100;
    running += p;
    runningH += pH;
    runningM += pM;
    dates.push(iso);
    pnlPerDay.push(p);
    cumulativePnl.push(Math.round(running * 100) / 100);
    cumulativeHoechsteKonfluenz.push(Math.round(runningH * 100) / 100);
    cumulativeModellFavorit.push(Math.round(runningM * 100) / 100);
  }
  const hasData = pnlPerDay.some((p) => p !== 0);
  return {
    fromIso,
    toIso: todayIso,
    dates,
    pnlPerDay,
    cumulativePnl,
    cumulativeHoechsteKonfluenz,
    cumulativeModellFavorit,
    totalPnl: Math.round(running * 100) / 100,
    totalHoechsteKonfluenz: Math.round(runningH * 100) / 100,
    totalModellFavorit: Math.round(runningM * 100) / 100,
    hasData
  };
}
