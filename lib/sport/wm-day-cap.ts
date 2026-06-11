// Tagesdeckel der Bankroll.
//
// Ehrliches Risiko-Management: pro Tag duerfen die schon
// uebernommenen Stakes + ein neuer Stake-Vorschlag in Summe nicht ueber
// einer einstellbaren Schwelle der Bankroll liegen.
//
// Default 8 % — Half-Kelly mit Tier-Cap (max 4 % pro Pick) erlaubt
// theoretisch zwei Hoechste-Konfluenz-Tipps am selben Tag; mehr soll
// nicht passieren ohne klare Entscheidung des Users.
//
// Reine Funktion. Keine I/O.

import type { StakeRecord } from '@/lib/sport/wm-bankroll-ledger';

export const DAY_CAP_PCT_DEFAULT = 8;

export interface WmDayCapStatus {
  capPct: number;
  capEur: number | null;
  usedTodayEur: number;
  usedTodayPct: number | null;
  // true wenn ein neuer Stake der Groesse stakeEur die Schwelle
  // ueberschreiten wuerde.
  wouldExceedCap: boolean;
  // Wieviel noch frei waere. null wenn bankroll unbekannt.
  remainingEur: number | null;
}

export function computeWmDayCapStatus(
  stakes: StakeRecord[],
  todayIso: string,
  bankrollEur: number | null,
  newStakeEur: number = 0,
  capPct: number = DAY_CAP_PCT_DEFAULT
): WmDayCapStatus {
  const heuteStakes = stakes.filter((s) => s.dateIso === todayIso);
  const usedTodayEur = Math.round(heuteStakes.reduce((sum, s) => sum + s.stakeEur, 0) * 100) / 100;
  if (bankrollEur === null || bankrollEur <= 0) {
    return {
      capPct,
      capEur: null,
      usedTodayEur,
      usedTodayPct: null,
      wouldExceedCap: false,
      remainingEur: null
    };
  }
  const capEur = Math.round(bankrollEur * (capPct / 100) * 100) / 100;
  const usedTodayPct = Math.round((usedTodayEur / bankrollEur) * 1000) / 10;
  const remainingEur = Math.round((capEur - usedTodayEur) * 100) / 100;
  const wouldExceedCap = newStakeEur > 0 && usedTodayEur + newStakeEur > capEur;
  return { capPct, capEur, usedTodayEur, usedTodayPct, wouldExceedCap, remainingEur };
}
