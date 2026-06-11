// Erinnerung an offene Endstand-Eintraege.
//
// Findet Picks, deren Spiel wahrscheinlich vorbei ist (>110 min seit
// Anstoss) UND fuer die noch KEIN Endstand vorliegt (weder manuell
// noch extern). Liefert pro offenem Pick einen Klartext-Hinweis.
//
// Reine Funktion. Keine I/O.

import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

export interface WmErgebnisNachtragInput {
  pickId: string;
  fixtureId: string;
  winnerTeam: string;
  opponentTeam: string;
  fixtureDateIso: string;
  fixtureTime: string | null;
  // true wenn manueller oder externer Endstand fuer diese fixtureId
  // schon vorliegt
  hasResult: boolean;
}

export interface WmErgebnisNachtragEntry {
  pickId: string;
  fixtureId: string;
  headline: string;             // "Spanien gegen Kap Verde — Endstand fehlt"
  minutesSinceKickoff: number;  // > 110
  daysOld: number;              // wie viele Tage zurueck das Spiel liegt
}

export interface WmErgebnisNachtragResult {
  entries: WmErgebnisNachtragEntry[];
}

const PROBABLY_OVER_MIN = 110;

export function computeWmErgebnisNachtrag(
  picks: WmErgebnisNachtragInput[],
  now: Date = new Date()
): WmErgebnisNachtragResult {
  const entries: WmErgebnisNachtragEntry[] = [];
  for (const p of picks) {
    if (p.hasResult) continue;
    const info = computeKickoffCountdown(p.fixtureDateIso, p.fixtureTime, now);
    if (info.status !== 'wahrscheinlich-vorbei') continue;
    if (info.minutesSinceKickoff === null) continue;
    if (info.minutesSinceKickoff <= PROBABLY_OVER_MIN) continue;
    const daysOld = Math.floor(info.minutesSinceKickoff / (60 * 24));
    entries.push({
      pickId: p.pickId,
      fixtureId: p.fixtureId,
      headline: `${p.winnerTeam} gegen ${p.opponentTeam} — Endstand fehlt`,
      minutesSinceKickoff: info.minutesSinceKickoff,
      daysOld
    });
  }
  // Aelteste zuerst — das nervt am meisten und sollte zuerst weg.
  entries.sort((a, b) => b.minutesSinceKickoff - a.minutesSinceKickoff);
  return { entries };
}
