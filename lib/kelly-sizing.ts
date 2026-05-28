export interface KellySuggestion {
  fullKellyPct: number;
  quarterKellyPct: number;
  recommendedRiskPct: number;
  confidenceFactor: number;
  edgePerTradeR: number;
  rationale: string;
  warning: string | null;
}

const KELLY_SAFETY_FRACTION = 0.25;
const HARD_RISK_CAP_PCT = 2;

/**
 * Kelly criterion: f* = (p*b - q) / b
 * p = win probability, q = 1-p, b = reward/risk ratio.
 * Returns the fraction of capital Kelly suggests betting (= risk per trade).
 */
export function kellyFraction(winRate: number, rewardRiskRatio: number): number {
  if (rewardRiskRatio <= 0) return 0;
  const p = Math.max(0, Math.min(1, winRate));
  const q = 1 - p;
  const f = (p * rewardRiskRatio - q) / rewardRiskRatio;
  return f;
}

/**
 * Maps a 0-100 confidence score to a 0.3-1.0 scaling factor.
 * Low-confidence setups get sized down sharply.
 */
export function confidenceToFactor(confidenceScore: number): number {
  if (confidenceScore >= 70) return 1.0;
  if (confidenceScore >= 60) return 0.7;
  if (confidenceScore >= 50) return 0.5;
  if (confidenceScore >= 40) return 0.35;
  return 0.25;
}

export function computeKellySuggestion(
  estimatedWinRate: number,
  rewardRiskRatio: number,
  confidenceScore: number,
  userMaxRiskPct: number
): KellySuggestion {
  const fullKelly = kellyFraction(estimatedWinRate, rewardRiskRatio);
  const fullKellyPct = fullKelly * 100;
  const quarterKellyPct = fullKellyPct * KELLY_SAFETY_FRACTION;
  const confidenceFactor = confidenceToFactor(confidenceScore);
  const edgePerTradeR = estimatedWinRate * rewardRiskRatio - (1 - estimatedWinRate);

  let warning: string | null = null;
  let recommendedRiskPct: number;

  if (fullKelly <= 0) {
    recommendedRiskPct = 0;
    warning = 'Kelly ist negativ oder Null — bei dieser Trefferquote/R:R hast du keinen Edge. Nicht traden.';
  } else {
    // Practical: take the smaller of (quarter-Kelly × confidence) and the user's max-risk,
    // then hard-cap at 2% to prevent ruinous sizing.
    const kellyBased = quarterKellyPct * confidenceFactor;
    const userBased = userMaxRiskPct * confidenceFactor;
    recommendedRiskPct = Math.min(kellyBased, userBased > 0 ? userBased : kellyBased, HARD_RISK_CAP_PCT);
    if (quarterKellyPct > HARD_RISK_CAP_PCT) {
      warning = `Quarter-Kelly (${quarterKellyPct.toFixed(1)}%) liegt über dem 2%-Sicherheits-Cap — gekappt. Voller Kelly ist für reale Trader zu volatil (Drawdowns brutal).`;
    }
  }

  const rationale =
    fullKelly > 0
      ? `Bei ~${(estimatedWinRate * 100).toFixed(0)}% Trefferquote und R:R 1:${rewardRiskRatio.toFixed(1)} ergibt Kelly ${fullKellyPct.toFixed(1)}% (voll, zu aggressiv). Quarter-Kelly ${quarterKellyPct.toFixed(1)}%, mit Konfidenz-Faktor ${confidenceFactor.toFixed(2)} und Sicherheits-Cap → empfohlen ${recommendedRiskPct.toFixed(2)}% des Kapitals riskieren.`
      : 'Kein positiver Edge bei diesen Parametern — Position-Sizing irrelevant, nicht traden.';

  return {
    fullKellyPct,
    quarterKellyPct,
    recommendedRiskPct,
    confidenceFactor,
    edgePerTradeR,
    rationale,
    warning
  };
}
