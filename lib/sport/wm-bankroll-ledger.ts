// Virtuelles Bankroll-Ledger fuer WM-Picks.
//
// Ehrlichkeits-Design: das Ledger enthaelt NUR Einsaetze, die der User
// explizit per Klick uebernommen hat ("Stake uebernehmen"). Keine
// automatische Historie, keine Fake-Eintraege. Outcomes kommen per
// Join aus dem Pick-Lern-Log (wm-pick-learning) — eine einzige
// Wahrheits-Quelle fuer Spielausgaenge, kein zweiter Resolver.
//
// P&L-Regeln pro Eintrag (Einheit EUR, virtuell):
//   win  → +stakeEur * (decimalOdds - 1)
//   loss → -stakeEur
//   push → 0 (Remis bei Sieger-Pick: Einsatz zurueck — konservative
//          Annahme; manche Buchmacher werten anders, das dokumentieren wir)
//   pending → null (noch offen)
//
// Reine Funktionen. Der localStorage-Wrapper liegt separat.

import type { WmPickLogEntry, WmPickOutcome } from '@/lib/sport/wm-pick-learning';

export interface StakeRecord {
  // pickId = `${fixtureId}-${winnerSide}` — identisch zum Lern-Log-Schema.
  id: string;
  fixtureId: string;
  winnerSide: 'home' | 'away';
  winnerTeam: string;
  opponentTeam: string;
  dateIso: string;          // Spieldatum
  stakePct: number;         // Empfehlung zum Zeitpunkt der Uebernahme
  stakeEur: number;         // konkreter Einsatz (virtuell)
  decimalOdds: number;      // vom User bestaetigte / angepasste Quote
  modelProbabilityPct: number;
  tier: 'hoechste-konfluenz' | 'modell-favorit';
  recordedAt: number;
}

export interface LedgerRow extends StakeRecord {
  outcome: WmPickOutcome;
  pnlEur: number | null;    // null solange pending
}

export interface LedgerSummary {
  totalEntries: number;
  pendingCount: number;
  resolvedCount: number;
  wins: number;
  losses: number;
  pushes: number;
  totalStakedEur: number;       // alle Eintraege
  resolvedStakedEur: number;    // nur resolved
  netPnlEur: number;            // Summe pnl der resolved
  roiPct: number | null;        // netPnl / resolvedStaked * 100
  hitRatePct: number | null;    // wins / (wins+losses)
  // Equity-Kurve chronologisch (resolved, nach recordedAt): kumulative
  // P&L-Summe. Startpunkt 0.
  equityCurve: number[];
}

export function pnlForOutcome(outcome: WmPickOutcome, stakeEur: number, decimalOdds: number): number | null {
  if (outcome === 'pending') return null;
  if (outcome === 'win') return Math.round(stakeEur * (decimalOdds - 1) * 100) / 100;
  if (outcome === 'loss') return -stakeEur;
  return 0; // push
}

// Join: Outcome pro Stake aus dem Pick-Lern-Log. Schluessel ist die id
// (fixtureId-winnerSide). Wenn das Log den Pick nicht kennt, bleibt der
// Eintrag pending — kein erfundenes Ergebnis.
export function joinLedger(stakes: StakeRecord[], pickLog: WmPickLogEntry[]): LedgerRow[] {
  const outcomeById = new Map(pickLog.map((e) => [e.id, e.outcome]));
  return stakes.map((s) => {
    const outcome = outcomeById.get(s.id) ?? 'pending';
    return {
      ...s,
      outcome,
      pnlEur: pnlForOutcome(outcome, s.stakeEur, s.decimalOdds)
    };
  });
}

export function summarizeLedger(rows: LedgerRow[]): LedgerSummary {
  const pending = rows.filter((r) => r.outcome === 'pending');
  const resolved = rows.filter((r) => r.outcome !== 'pending');
  const wins = resolved.filter((r) => r.outcome === 'win').length;
  const losses = resolved.filter((r) => r.outcome === 'loss').length;
  const pushes = resolved.filter((r) => r.outcome === 'push').length;
  const totalStakedEur = Math.round(rows.reduce((s, r) => s + r.stakeEur, 0) * 100) / 100;
  const resolvedStakedEur = Math.round(resolved.reduce((s, r) => s + r.stakeEur, 0) * 100) / 100;
  const netPnlEur = Math.round(resolved.reduce((s, r) => s + (r.pnlEur ?? 0), 0) * 100) / 100;
  const roiPct = resolvedStakedEur > 0 ? Math.round((netPnlEur / resolvedStakedEur) * 1000) / 10 : null;
  const decisive = wins + losses;
  const hitRatePct = decisive > 0 ? Math.round((wins / decisive) * 100) : null;
  // Equity-Kurve chronologisch nach recordedAt.
  const chrono = [...resolved].sort((a, b) => a.recordedAt - b.recordedAt);
  const equityCurve: number[] = [0];
  let running = 0;
  for (const r of chrono) {
    running += r.pnlEur ?? 0;
    equityCurve.push(Math.round(running * 100) / 100);
  }
  return {
    totalEntries: rows.length,
    pendingCount: pending.length,
    resolvedCount: resolved.length,
    wins,
    losses,
    pushes,
    totalStakedEur,
    resolvedStakedEur,
    netPnlEur,
    roiPct,
    hitRatePct,
    equityCurve
  };
}
