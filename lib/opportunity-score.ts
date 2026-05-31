// Unified opportunity score across asset classes. Each class delivers its
// own inputs, this scorer returns a single 0–100 number plus a label.

export type OpportunityVerdict =
  | 'avoid'
  | 'weak_watch'
  | 'watch'
  | 'cautious_opportunity'
  | 'strong_opportunity'
  | 'rare_high_quality';

export interface OpportunityInputs {
  // 0–20: how aligned is the trend (EMA structure, higher highs etc.)
  trend: number;
  // 0–15: how strong is momentum (RSI/MACD/ADX)
  momentum: number;
  // 0–15: how friendly is the broader market right now
  marketEnvironment: number;
  // 0–20: reward-vs-risk ratio of the proposed levels
  rewardRisk: number;
  // 0–10: timing — fresh setup, not chased, near support not resistance
  timing: number;
  // 0–10: how liquid / tradeable the asset is at the user's brokers
  liquidity: number;
  // 0–10: matches the user's stated risk preference / portfolio gap
  userFit: number;
}

export interface OpportunityScoreResult {
  score: number;
  verdict: OpportunityVerdict;
  label: string;
  shortReason: string;
}

export function scoreOpportunity(inputs: OpportunityInputs): OpportunityScoreResult {
  const score = Math.max(0, Math.min(100, Math.round(
    inputs.trend + inputs.momentum + inputs.marketEnvironment +
    inputs.rewardRisk + inputs.timing + inputs.liquidity + inputs.userFit
  )));

  let verdict: OpportunityVerdict;
  let label: string;
  let shortReason: string;
  if (score >= 90) {
    verdict = 'rare_high_quality';
    label = 'sehr seltene Hochqualitäts-Gelegenheit';
    shortReason = 'Alle sieben Bewertungs-Säulen liefern starke Werte. Solche Setups sind selten — aber auch dann gilt: Stop respektieren.';
  } else if (score >= 80) {
    verdict = 'strong_opportunity';
    label = 'starke Gelegenheit';
    shortReason = 'Alle Hauptsäulen liefern gute Werte, Risiko-Profil ist günstig.';
  } else if (score >= 70) {
    verdict = 'cautious_opportunity';
    label = 'interessante Gelegenheit mit kontrolliertem Risiko';
    shortReason = 'Setup ist solide, nur mit klarem Stop einsteigen und Position klein halten.';
  } else if (score >= 55) {
    verdict = 'watch';
    label = 'beobachten';
    shortReason = 'Noch keine saubere Konfluenz — auf bestätigten Einstieg warten.';
  } else if (score >= 40) {
    verdict = 'weak_watch';
    label = 'schwacher Watchlist-Kandidat';
    shortReason = 'Mehr Schwächen als Stärken — eher nicht handeln, nur im Auge behalten.';
  } else {
    verdict = 'avoid';
    label = 'meiden';
    shortReason = 'Setup ist statistisch nicht profitabel — Kapital schützen.';
  }

  return { score, verdict, label, shortReason };
}

// Convenience scorer for the master signal candidate world. Maps a
// RankedCandidate-like input to OpportunityInputs.
export function scoreCryptoCandidate(input: {
  passedCount: number;
  totalCount: number;
  structure: 'uptrend' | 'downtrend' | 'range';
  nearSupport: boolean;
  rrTp1: number;
  quoteVolume: number;
  priceChangePct24h: number;
  marketMood: 'risk-on' | 'risk-off' | 'neutral';
  userBrokerAvailable: boolean;
  isOnWatchlist: boolean;
}): OpportunityScoreResult {
  // Trend: structure + a portion of passedCount.
  const trend =
    (input.structure === 'uptrend' ? 14 : input.structure === 'range' ? 7 : 0)
    + Math.min(6, Math.round(input.passedCount / 2));

  // Momentum: directly from passedCount fraction.
  const momentum = Math.min(15, Math.round((input.passedCount / input.totalCount) * 15));

  // Market environment.
  const marketEnvironment =
    input.marketMood === 'risk-on' ? 15 :
    input.marketMood === 'risk-off' ? 0 :
    8;

  // Reward/Risk: TP1 vs Stop ratio. After a big pump the R/R is statistically
  // worse because we're closer to the top, so halve when chasing.
  let rewardRisk =
    input.rrTp1 >= 2 ? 20 :
    input.rrTp1 >= 1.5 ? 15 :
    input.rrTp1 >= 1 ? 8 : 0;
  if (input.priceChangePct24h > 15) rewardRisk = Math.round(rewardRisk / 2);

  // Timing: punish chasing (>10% in 24h), reward near-support uptrends.
  const timing =
    input.priceChangePct24h > 15 ? 0 :
    input.priceChangePct24h > 10 ? 3 :
    input.nearSupport ? 10 :
    input.priceChangePct24h > 5 ? 5 :
    7;

  // Liquidity: log scale.
  const liquidity =
    input.quoteVolume >= 500_000_000 ? 10 :
    input.quoteVolume >= 100_000_000 ? 8 :
    input.quoteVolume >= 50_000_000 ? 5 :
    input.quoteVolume >= 10_000_000 ? 2 : 0;

  // User fit: broker reachable + watchlist preference.
  const userFit =
    (input.userBrokerAvailable ? 7 : 0) +
    (input.isOnWatchlist ? 3 : 0);

  return scoreOpportunity({ trend, momentum, marketEnvironment, rewardRisk, timing, liquidity, userFit });
}
