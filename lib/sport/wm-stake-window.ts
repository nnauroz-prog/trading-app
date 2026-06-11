// Stake-Fenster: darf ein Pick noch uebernommen werden?
//
// Regel: Stakes sind nur VOR dem Anstoss erlaubt. Nach Anstoss wuerde
// ein Eintrag die P&L-Statistik verfaelschen (man wuerde nur noch
// Picks eintragen, die gut aussehen). Buchmacher nehmen Pre-Match-
// Wetten nach Anpfiff ebenfalls nicht mehr an.
//
// Spiele ohne Anstoss-Zeit gelten als offen (TBD-Zeiten sollen das
// Uebernehmen nicht blockieren).
//
// Reine Funktion. Keine I/O.

import { computeKickoffCountdown } from '@/lib/sport/wm-kickoff-countdown';

export interface WmStakeWindow {
  open: boolean;
  reason: string | null; // Klartext wenn geschlossen
}

export function evaluateStakeWindow(dateIso: string, time: string | null, now: Date = new Date()): WmStakeWindow {
  if (!time) return { open: true, reason: null };
  const info = computeKickoffCountdown(dateIso, time, now);
  if (info.status === 'vor-anstoss') return { open: true, reason: null };
  if (info.status === 'laeuft') {
    return { open: false, reason: 'Spiel laeuft — Stake-Uebernahme gesperrt.' };
  }
  return { open: false, reason: 'Spiel vorbei — Stake-Uebernahme gesperrt.' };
}
