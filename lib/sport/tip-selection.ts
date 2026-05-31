import { FootballProbabilityModel } from '@/lib/sport/probabilities';

export type TipTier = 'konservativ' | 'standard' | 'risiko';

export interface TipSelection {
  tier: TipTier;
  market: string;        // "Over 1.5 Tore" / "1X" / "1:1 Ergebnis"
  probabilityPct: number; // 0-100
  reason: string;        // why this tip
  warning?: string;      // optional caveat
  available: boolean;    // false if no tip qualifies for this tier
}

interface Candidate {
  market: string;
  probability: number; // 0..1
}

function pctRound(p: number): number {
  return Math.round(p * 1000) / 10;
}

// Generate all candidate markets we know how to derive from the model.
function allCandidates(m: FootballProbabilityModel, homeTeam: string, awayTeam: string): Candidate[] {
  return [
    // 1X2
    { market: `Heimsieg ${homeTeam}`, probability: m.homeWin },
    { market: 'Unentschieden', probability: m.draw },
    { market: `Auswärtssieg ${awayTeam}`, probability: m.awayWin },
    // Doppelte Chance (1X / X2 / 12)
    { market: `1X (${homeTeam} oder Unentschieden)`, probability: m.homeWin + m.draw },
    { market: `X2 (${awayTeam} oder Unentschieden)`, probability: m.awayWin + m.draw },
    { market: `12 (kein Unentschieden)`, probability: m.homeWin + m.awayWin },
    // Tore
    { market: 'Over 0.5 Tore', probability: m.over05 },
    { market: 'Over 1.5 Tore', probability: m.over15 },
    { market: 'Over 2.5 Tore', probability: m.over25 },
    { market: 'Under 2.5 Tore', probability: m.under25 },
    { market: 'Beide Teams treffen', probability: m.bothTeamsToScore },
    { market: 'Beide Teams treffen NICHT', probability: m.bothTeamsNotToScore }
  ];
}

// Konservativ: nimm das Ereignis mit höchster Wahrscheinlichkeit, wenn >= 65%.
export function konservativerTipp(m: FootballProbabilityModel, homeTeam: string, awayTeam: string): TipSelection {
  const candidates = allCandidates(m, homeTeam, awayTeam).filter((c) => c.probability >= 0.65);
  candidates.sort((a, b) => b.probability - a.probability);
  if (candidates.length === 0) {
    return {
      tier: 'konservativ',
      market: '—',
      probabilityPct: 0,
      reason: 'Kein Ereignis erreicht 65% Modell-Wahrscheinlichkeit. Heute kein konservativer Tipp.',
      available: false
    };
  }
  const top = candidates[0];
  const warning = m.modelConfidence === 'low' ? 'Confidence niedrig — Modell-Wahrscheinlichkeit auf dünner Datenbasis.' : undefined;
  return {
    tier: 'konservativ',
    market: top.market,
    probabilityPct: pctRound(top.probability),
    reason: `Modell-Wahrscheinlichkeit ${pctRound(top.probability)}% — stabilster Tipp aus den verfügbaren Märkten.`,
    warning,
    available: true
  };
}

// Standard: nimm das stärkste 1X2-Hauptergebnis, wenn 50-65%.
export function standardTipp(m: FootballProbabilityModel, homeTeam: string, awayTeam: string): TipSelection {
  const mains: Candidate[] = [
    { market: `Heimsieg ${homeTeam}`, probability: m.homeWin },
    { market: 'Unentschieden', probability: m.draw },
    { market: `Auswärtssieg ${awayTeam}`, probability: m.awayWin },
    { market: 'Over 2.5 Tore', probability: m.over25 },
    { market: 'Beide Teams treffen', probability: m.bothTeamsToScore }
  ];
  mains.sort((a, b) => b.probability - a.probability);
  const top = mains[0];
  if (top.probability < 0.42) {
    return {
      tier: 'standard',
      market: '—',
      probabilityPct: pctRound(top.probability),
      reason: 'Auch der wahrscheinlichste Hauptmarkt liegt unter 42% — nur beobachten, kein Tipp.',
      available: false
    };
  }
  const warning = m.modelConfidence === 'low' ? 'Confidence niedrig.' : undefined;
  return {
    tier: 'standard',
    market: top.market,
    probabilityPct: pctRound(top.probability),
    reason: top.probability >= 0.5
      ? `Hauptmarkt mit ${pctRound(top.probability)}% — solides Standard-Setup.`
      : `Hauptmarkt nur ${pctRound(top.probability)}% — knapp, lieber Watch als Tipp.`,
    warning,
    available: top.probability >= 0.5
  };
}

// Risiko: nimm ein wahrscheinlichkeits-mäßig dünnes Ereignis (höhere Quote
// in Tippspielen), klar als Risiko markiert.
export function risikoTipp(m: FootballProbabilityModel): TipSelection {
  // Bevorzuge das wahrscheinlichste exakte Ergebnis als „Risiko-Tipp“.
  const top = m.topScorelines[0];
  if (!top || top.probability < 0.04) {
    return {
      tier: 'risiko',
      market: '—',
      probabilityPct: 0,
      reason: 'Selbst das wahrscheinlichste Ergebnis ist zu unsicher — kein Risiko-Tipp.',
      available: false
    };
  }
  return {
    tier: 'risiko',
    market: `Ergebnis ${top.score}`,
    probabilityPct: pctRound(top.probability),
    reason: `Wahrscheinlichstes genaues Ergebnis: ${top.score} mit ${pctRound(top.probability)}%. Exakte Ergebnisse bleiben grundsätzlich unsicher — nur für private Tipp-Runden.`,
    warning: 'Risiko-Tipp — niedrige Wahrscheinlichkeit, hohe Quote. Nicht als Hauptempfehlung verstehen.',
    available: true
  };
}

export interface AllTips {
  konservativ: TipSelection;
  standard: TipSelection;
  risiko: TipSelection;
}

export function generateTips(m: FootballProbabilityModel, homeTeam: string, awayTeam: string): AllTips {
  return {
    konservativ: konservativerTipp(m, homeTeam, awayTeam),
    standard: standardTipp(m, homeTeam, awayTeam),
    risiko: risikoTipp(m)
  };
}
