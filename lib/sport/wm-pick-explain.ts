// Tipp-Erklaer-Karte. Nimmt einen WmWinnerPick und zerlegt ihn in eine
// strukturierte, fuer Laien lesbare Sicht: Welche Faktoren stuetzen den
// Tipp, welche dagegen, wie gross ist jeder Beitrag.
//
// Reine Pure-Lib. Keine I/O. Komplett deterministisch und testbar.

import type { WmWinnerPick } from '@/lib/sport/wm-winner-picks';

export interface WmPickExplainRow {
  // Stabiler Key fuer React und Tests.
  id: string;
  label: string;
  // Klartext-Wert/Beschreibung, z. B. "+0.4 ELO" oder "neutral".
  valueLabel: string;
  // Wirkung auf die Pick-Seite: 'fuer' = stuetzt die Pick-Seite, 'gegen'
  // = arbeitet dagegen, 'neutral' = kein Beitrag.
  direction: 'fuer' | 'gegen' | 'neutral';
  // |gewicht| in einer einfachen 0–3-Skala fuer die UI-Balken.
  weight: 0 | 1 | 2 | 3;
  // Optionaler Hinweis fuer den User (1 Satz, deutsch, kein Fachjargon).
  hint?: string;
}

export interface WmPickExplanation {
  fixtureId: string;
  headline: string;          // z. B. "Spanien gegen Kap Verde"
  pickLabel: string;         // z. B. "Wir tippen auf Spanien"
  modelProbabilityPct: number;
  eloDiff: number;
  tier: WmWinnerPick['tier'];
  rows: WmPickExplainRow[];
  proTipperStatusLabel: string; // z. B. "Profi-Tipper-Agent: OK"
  riskNotes: string[];
}

function weightOfShift(absShift: number): 0 | 1 | 2 | 3 {
  if (absShift < 0.05) return 0;
  if (absShift < 0.2) return 1;
  if (absShift < 0.5) return 2;
  return 3;
}

function directionFromShift(shift: number, winnerSide: 'home' | 'away'): 'fuer' | 'gegen' | 'neutral' {
  if (Math.abs(shift) < 0.05) return 'neutral';
  // confidenceShift > 0 stuetzt Heim, < 0 stuetzt Auswaerts.
  if (winnerSide === 'home') return shift > 0 ? 'fuer' : 'gegen';
  return shift < 0 ? 'fuer' : 'gegen';
}

function formatEloDelta(home: number, away: number, winnerSide: 'home' | 'away'): string {
  const own = winnerSide === 'home' ? home : away;
  const opp = winnerSide === 'home' ? away : home;
  const net = own - opp;
  if (Math.abs(net) < 0.5) return 'neutral';
  return `${net > 0 ? '+' : ''}${net.toFixed(0)} ELO`;
}

export function explainWmPick(pick: WmWinnerPick): WmPickExplanation {
  const rows: WmPickExplainRow[] = [];
  const winnerSide = pick.winnerSide;
  const opponentTeam = winnerSide === 'home' ? pick.fixture.awayTeam : pick.fixture.homeTeam;

  // 1) ELO-Basis. Immer drin — das ist der Anker des Picks.
  const eloAbs = Math.abs(pick.eloDiff);
  rows.push({
    id: 'elo-basis',
    label: 'ELO-Vorsprung',
    valueLabel: `${pick.eloDiff > 0 ? '+' : ''}${pick.eloDiff.toFixed(0)} Punkte`,
    direction: eloAbs >= 1 ? 'fuer' : 'neutral',
    weight: eloAbs > 300 ? 3 : eloAbs > 150 ? 2 : eloAbs > 50 ? 1 : 0,
    hint: 'ELO misst die historische Spielstaerke. Je groesser der Vorsprung, desto klarer der Favorit.'
  });

  // 2) Modell-Wahrscheinlichkeit.
  rows.push({
    id: 'modell',
    label: 'Modell-Wahrscheinlichkeit',
    valueLabel: `${pick.modelProbabilityPct} %`,
    direction: pick.modelProbabilityPct >= 60 ? 'fuer' : 'neutral',
    weight: pick.modelProbabilityPct >= 75 ? 3 : pick.modelProbabilityPct >= 65 ? 2 : 1,
    hint: 'Das Modell rechnet ELO + Tor-Erwartung in eine Sieg-Wahrscheinlichkeit um.'
  });

  // 3) Umfeld-Faktoren (Conditions).
  for (const f of pick.conditions.factors) {
    const direction = directionFromShift(f.confidenceShift, winnerSide);
    rows.push({
      id: `cond-${f.id}`,
      label: f.label,
      valueLabel: formatEloDelta(f.homeEloDelta, f.awayEloDelta, winnerSide),
      direction,
      weight: weightOfShift(Math.abs(f.confidenceShift))
    });
  }

  // 4) Profi-Tipper-Stuetze (conviction in %).
  const convictionPct = Math.round(pick.proTipper.conviction * 100);
  rows.push({
    id: 'profi-tipper',
    label: 'Profi-Tipper-Pruefung',
    valueLabel: `${convictionPct} % Konfluenz`,
    direction: pick.proTipper.status === 'OK' ? 'fuer' : pick.proTipper.status === 'BLOCKIERT' ? 'gegen' : 'neutral',
    weight: convictionPct >= 90 ? 3 : convictionPct >= 75 ? 2 : 1,
    hint: 'Pruefungen wie xG-Konsistenz, Lineup-Verfuegbarkeit, Neutralvenue-Realitaet.'
  });

  return {
    fixtureId: pick.fixture.id,
    headline: `${pick.fixture.homeTeam} gegen ${pick.fixture.awayTeam}`,
    pickLabel: `Wir tippen auf ${pick.winnerTeam} gegen ${opponentTeam}`,
    modelProbabilityPct: pick.modelProbabilityPct,
    eloDiff: pick.eloDiff,
    tier: pick.tier,
    rows,
    proTipperStatusLabel: `Profi-Tipper-Agent: ${pick.proTipper.status}`,
    riskNotes: pick.riskNotes
  };
}
