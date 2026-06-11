// WM-Phase-Detector. Klassifiziert anhand von Datum + erstem/letzten
// Fixture in welcher Phase wir uns befinden:
//
//   'vor-wm'        — Eroeffnung in der Zukunft, mehr als 0 Tage entfernt
//   'eroeffnungs-tag' — heute findet das Eroeffnungsspiel statt
//   'wm-laeuft'     — zwischen Tag 2 und letztem Spielttag
//   'wm-vorbei'     — letztes Spiel liegt in der Vergangenheit
//
// Reine Funktion. Bekommt die Schedule mit (Default = WM_2026_FIXTURES).

import { WM_2026_FIXTURES, type WmFixture } from '@/lib/sport/wm-schedule-2026';

export type WmPhase = 'vor-wm' | 'eroeffnungs-tag' | 'wm-laeuft' | 'wm-vorbei';

export interface WmPhaseInfo {
  phase: WmPhase;
  openingDateIso: string;
  closingDateIso: string;
  openingFixture: WmFixture | null;
  daysUntilOpening: number;
}

function diffDays(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00`);
  const b = new Date(`${toIso}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function detectWmPhase(todayIso: string, schedule: WmFixture[] = WM_2026_FIXTURES): WmPhaseInfo {
  if (schedule.length === 0) {
    return {
      phase: 'vor-wm',
      openingDateIso: todayIso,
      closingDateIso: todayIso,
      openingFixture: null,
      daysUntilOpening: 0
    };
  }
  const sorted = [...schedule].sort((a, b) => (a.date === b.date ? (a.time ?? '').localeCompare(b.time ?? '') : a.date.localeCompare(b.date)));
  const openingFixture = sorted[0];
  const openingDateIso = openingFixture.date;
  const closingDateIso = sorted[sorted.length - 1].date;
  const daysUntilOpening = diffDays(todayIso, openingDateIso);
  let phase: WmPhase;
  if (todayIso < openingDateIso) phase = 'vor-wm';
  else if (todayIso === openingDateIso) phase = 'eroeffnungs-tag';
  else if (todayIso <= closingDateIso) phase = 'wm-laeuft';
  else phase = 'wm-vorbei';
  return { phase, openingDateIso, closingDateIso, openingFixture, daysUntilOpening };
}
