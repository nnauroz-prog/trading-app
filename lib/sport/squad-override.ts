// User-gesteuerte Spielstand-Anpassungen pro Fixture. Statt auf einen
// brueckligen externen Lineup-Feed zu warten, kann der User selbst pro
// Spiel markieren, welche Stamm-Spieler fehlen oder welche Sondersituation
// (Rotation, Pokalfinale, Top-Fokus) gerade gilt. Die Engine modelliert
// daraus einen Multiplier auf lambdaHome / lambdaAway. Reine Funktion,
// voll testbar.
//
// Die Impakte sind bewusst konservativ kalibriert. Studien zur Player-
// Strength-Modellierung (z.B. Boice/Brimberg, Constantinou & Fenton) zeigen:
//   - Star-Stuermer-Ausfall ist ~8-12 % Offensiv-Verlust.
//   - Top-Torwart-Ausfall ~10-15 % Defensiv-Verlust (mehr Gegentore).
//   - Innenverteidiger-Ausfall ~8-12 % Defensiv-Verlust.
//   - Massen-Ausfaelle (mehrere Stammspieler) summieren nicht-linear, ~10 %.
//   - Voller Fokus (z.B. Pokalfinale) ~3-7 % Aufschlag.
//   - Rotation/B-Elf vor wichtigerem Spiel ~5-10 % Abschlag.

export type SquadFactor =
  | 'top-scorer-out'
  | 'goalkeeper-out'
  | 'center-back-out'
  | 'multiple-starters-out'
  | 'fully-focused'
  | 'rotation-mode';

export interface SquadOverride {
  fixtureId: string;
  homeFactors: SquadFactor[];
  awayFactors: SquadFactor[];
  updatedAt: number;
}

export interface SquadAdjustment {
  homeLambdaMul: number;
  awayLambdaMul: number;
  factors: string[];
  // Wieviele Faktoren wurden insgesamt aktiviert? Fuer UI-Zaehler.
  totalFactors: number;
}

interface FactorImpact {
  label: string;
  ownLambdaMul: number;        // wirkt auf die EIGENE lambda (Offensiv-Output)
  opponentLambdaMul: number;   // wirkt auf die GEGNERISCHE lambda (Defensiv-Verlust)
}

export const SQUAD_FACTOR_META: Record<SquadFactor, { label: string; description: string; emoji: string }> = {
  'top-scorer-out': {
    label: 'Topscorer/Stuermer fehlt',
    description: '~10 % weniger eigene Tore',
    emoji: '🥅'
  },
  'goalkeeper-out': {
    label: 'Stammtorwart fehlt',
    description: '~15 % mehr Gegentore',
    emoji: '🧤'
  },
  'center-back-out': {
    label: 'Stamm-Innenverteidiger fehlt',
    description: '~10 % mehr Gegentore',
    emoji: '🛡️'
  },
  'multiple-starters-out': {
    label: 'Mehrere Stammspieler fehlen',
    description: '-8 % eigene Tore, +5 % Gegentore',
    emoji: '⚕'
  },
  'fully-focused': {
    label: 'Voll fokussiert (Pokal/WM-Modus)',
    description: '+5 % eigene Tore',
    emoji: '🎯'
  },
  'rotation-mode': {
    label: 'Rotation / B-Elf (wichtigeres Spiel folgt)',
    description: '-8 % eigene Tore',
    emoji: '😴'
  }
};

const IMPACTS: Record<SquadFactor, FactorImpact> = {
  'top-scorer-out': { label: 'Topscorer fehlt', ownLambdaMul: 0.90, opponentLambdaMul: 1 },
  'goalkeeper-out': { label: 'Torwart fehlt', ownLambdaMul: 1, opponentLambdaMul: 1.15 },
  'center-back-out': { label: 'Innenverteidiger fehlt', ownLambdaMul: 1, opponentLambdaMul: 1.10 },
  'multiple-starters-out': { label: 'Mehrere Stammspieler fehlen', ownLambdaMul: 0.92, opponentLambdaMul: 1.05 },
  'fully-focused': { label: 'Voll fokussiert', ownLambdaMul: 1.05, opponentLambdaMul: 1 },
  'rotation-mode': { label: 'Rotation/B-Elf', ownLambdaMul: 0.92, opponentLambdaMul: 1 }
};

// Maximaler Effekt eines Overrides auf eine Seite: ±25 %. Verhindert, dass
// vier Faktoren zusammen die Erwartung halbieren.
const MIN_MUL = 0.75;
const MAX_MUL = 1.25;

export function applySquadAdjustment(override: SquadOverride | null): SquadAdjustment {
  if (!override) return { homeLambdaMul: 1, awayLambdaMul: 1, factors: [], totalFactors: 0 };
  let homeMul = 1;
  let awayMul = 1;
  const factors: string[] = [];
  for (const f of override.homeFactors) {
    const imp = IMPACTS[f];
    if (!imp) continue;
    homeMul *= imp.ownLambdaMul;
    awayMul *= imp.opponentLambdaMul;
    factors.push(`Heim: ${imp.label}`);
  }
  for (const f of override.awayFactors) {
    const imp = IMPACTS[f];
    if (!imp) continue;
    awayMul *= imp.ownLambdaMul;
    homeMul *= imp.opponentLambdaMul;
    factors.push(`Auswaerts: ${imp.label}`);
  }
  return {
    homeLambdaMul: Math.max(MIN_MUL, Math.min(MAX_MUL, homeMul)),
    awayLambdaMul: Math.max(MIN_MUL, Math.min(MAX_MUL, awayMul)),
    factors,
    totalFactors: override.homeFactors.length + override.awayFactors.length
  };
}

// Recompute the Poisson 1X2 probabilities + likelyScore aus zwei lambdas.
// Kopie der Logik aus predictor.ts, damit Client-Komponenten ohne den Fixture-
// Pool die ueberstimmten Werte neu berechnen koennen.
const MAX_GOALS = 6;

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial;
}

export interface PoissonProbs {
  pHome: number;
  pDraw: number;
  pAway: number;
  likelyScore: { home: number; away: number };
}

export function recomputePoissonProbs(lambdaHome: number, lambdaAway: number): PoissonProbs {
  let pH = 0, pD = 0, pA = 0;
  let bestProb = 0;
  let likelyScore = { home: 0, away: 0 };
  for (let h = 0; h <= MAX_GOALS; h++) {
    const ph = poissonPmf(h, lambdaHome);
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph * poissonPmf(a, lambdaAway);
      if (p > bestProb) {
        bestProb = p;
        likelyScore = { home: h, away: a };
      }
      if (h > a) pH += p;
      else if (h < a) pA += p;
      else pD += p;
    }
  }
  const total = pH + pD + pA;
  return {
    pHome: pH / total,
    pDraw: pD / total,
    pAway: pA / total,
    likelyScore
  };
}
