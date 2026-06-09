// User-gesteuerte Per-Coin Faktoren, analog zu lib/sport/squad-override.
// Der User markiert pro Coin Dinge, die das Modell nicht sieht (Token-
// Unlocks, anstehende ETF-Entscheidungen, sichtbare Whale-Bewegungen,
// regulatorische Unsicherheit). Daraus berechnet die Engine einen
// Score-Adjustment auf die Safety-Bewertung der jeweiligen Empfehlung.
// Reine Funktion, voll testbar.

export type CoinOverrideFactor =
  | 'major-event-today'      // Mainnet-Launch / ETF / Halving
  | 'large-unlock-today'     // Bekannter grosser Token-Unlock heute
  | 'whale-selling-visible'  // Top-Holder dumpt sichtbar on-chain
  | 'whale-accumulating'     // Top-Holder kauft erkennbar auf
  | 'regulatory-uncertainty' // Anstehende Regulator-Entscheidung
  | 'manual-conviction'      // Pers. Ueberzeugung: ich vertraue diesem Setup
  | 'manual-distrust';       // Pers. Vorbehalt: ich bin unsicher

export interface CoinOverride {
  coinId: string;
  factors: CoinOverrideFactor[];
  updatedAt: number;
}

export interface CoinAdjustment {
  scoreDelta: number;     // Punkte auf den Safety-Score addieren (kann neg.)
  capped: boolean;        // Wurde geclamped?
  factors: string[];      // Klartext-Begruendung fuer UI
  // Wenn ein „Vetomacher" gesetzt ist (massive Distrust, Unlock heute):
  // wir setzen die Empfehlung explizit auf WATCH-only zurueck.
  hardVeto: boolean;
}

interface FactorImpact {
  label: string;
  scoreDelta: number;
  hardVeto?: boolean;
}

export const COIN_FACTOR_META: Record<CoinOverrideFactor, { label: string; description: string; emoji: string }> = {
  'major-event-today': {
    label: 'Major-Event heute (Mainnet/ETF/Halving)',
    description: 'Bekannter Katalysator → +10 Score',
    emoji: '🚀'
  },
  'large-unlock-today': {
    label: 'Grosser Token-Unlock heute',
    description: 'Verkaufsdruck erwartet → -15 Score + Veto',
    emoji: '🔓'
  },
  'whale-selling-visible': {
    label: 'Whale verkauft on-chain sichtbar',
    description: 'Druck von oben → -10 Score',
    emoji: '🐳'
  },
  'whale-accumulating': {
    label: 'Whale kauft on-chain auf',
    description: 'Demand von oben → +5 Score',
    emoji: '🐋'
  },
  'regulatory-uncertainty': {
    label: 'Regulator-Entscheidung anstehend',
    description: 'Politisches Risiko → -10 Score',
    emoji: '⚖'
  },
  'manual-conviction': {
    label: 'Pers. Ueberzeugung: vertraue dem Setup',
    description: 'Manuelle Conviction → +10 Score',
    emoji: '✓'
  },
  'manual-distrust': {
    label: 'Pers. Vorbehalt: unsicher',
    description: 'Manuelles Misstrauen → -20 Score + Veto',
    emoji: '✗'
  }
};

const IMPACTS: Record<CoinOverrideFactor, FactorImpact> = {
  'major-event-today':       { label: 'Major-Event heute', scoreDelta: 10 },
  'large-unlock-today':      { label: 'Token-Unlock heute', scoreDelta: -15, hardVeto: true },
  'whale-selling-visible':   { label: 'Whale verkauft', scoreDelta: -10 },
  'whale-accumulating':      { label: 'Whale akkumuliert', scoreDelta: 5 },
  'regulatory-uncertainty':  { label: 'Regulator-Entscheidung anstehend', scoreDelta: -10 },
  'manual-conviction':       { label: 'Pers. Ueberzeugung', scoreDelta: 10 },
  'manual-distrust':         { label: 'Pers. Misstrauen', scoreDelta: -20, hardVeto: true }
};

// Max-Auslenkung pro Coin: ±25 Score-Punkte. Verhindert dass mehrere starke
// Faktoren zusammen die Bewertung komplett kippen, ohne sie sinnvoll zu
// modellieren.
const MAX_DELTA = 25;

export function applyCoinAdjustment(override: CoinOverride | null): CoinAdjustment {
  if (!override || override.factors.length === 0) {
    return { scoreDelta: 0, capped: false, factors: [], hardVeto: false };
  }
  let rawDelta = 0;
  let hardVeto = false;
  const factors: string[] = [];
  for (const f of override.factors) {
    const imp = IMPACTS[f];
    if (!imp) continue;
    rawDelta += imp.scoreDelta;
    if (imp.hardVeto) hardVeto = true;
    factors.push(imp.label);
  }
  const clamped = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, rawDelta));
  return {
    scoreDelta: clamped,
    capped: clamped !== rawDelta,
    factors,
    hardVeto
  };
}
