// Turnier-Zeitstatus der WM 2026. Reine Datums-Logik, keine Netzwerk-
// oder Live-Daten.
//
// Hintergrund (wichtiger Bugfix): Die App war zeitlich auf eine
// bevorstehende/laufende WM eingefroren. Nach dem Finale (19.07.2026)
// zeigte die WM-Seite weiterhin eine "Turniersieg-Wahrscheinlichkeit"
// fuer ein bereits beendetes Turnier an ("Top-Favorit: Spanien 53 %"),
// und die Startseite fuehrte im Titel/Hero weiter mit "WM 2026". Das
// wirkt kaputt, weil es sachlich falsch ist.
//
// Dieser Helper liefert eine klare Phase, an der sich UI-Entscheidungen
// ausrichten koennen: vor dem Turnier, waehrend, oder danach.

import { WM_2026_FIXTURES } from '@/lib/sport/wm-schedule-2026';

export type WmTournamentPhase = 'before' | 'during' | 'after';

// Eroeffnung und Finale aus dem Spielplan ableiten (nicht hartkodieren,
// damit es konsistent bleibt, falls der Plan sich aendert).
function scheduleBounds(): { startIso: string; endIso: string } {
  const dates = WM_2026_FIXTURES.map((f) => f.date).sort();
  return {
    startIso: dates[0] ?? '2026-06-11',
    endIso: dates[dates.length - 1] ?? '2026-07-19'
  };
}

export const WM_START_ISO = scheduleBounds().startIso;
export const WM_END_ISO = scheduleBounds().endIso;

export function wmTournamentPhase(todayIso: string): WmTournamentPhase {
  const today = todayIso.slice(0, 10);
  if (today < WM_START_ISO) return 'before';
  if (today > WM_END_ISO) return 'after';
  return 'during';
}

export function isWmOver(todayIso: string): boolean {
  return wmTournamentPhase(todayIso) === 'after';
}

// Ganze Tage seit dem Finale (negativ, wenn das Finale noch aussteht).
export function daysSinceWmEnd(todayIso: string): number {
  const today = new Date(`${todayIso.slice(0, 10)}T00:00:00Z`).getTime();
  const end = new Date(`${WM_END_ISO}T00:00:00Z`).getTime();
  return Math.round((today - end) / (24 * 60 * 60 * 1000));
}
