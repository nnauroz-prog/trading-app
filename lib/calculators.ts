export interface PositionSizingResult {
  positionSize: number;       // # of units
  notional: number;           // total $ value of position
  riskAmount: number;         // $ at risk if stop hits
  stopDistancePct: number;    // distance from entry to stop in %
  feasible: boolean;
  warning?: string;
}

export function positionSizing(args: {
  accountBalance: number;
  riskPerTradePct: number;
  entryPrice: number;
  stopPrice: number;
}): PositionSizingResult {
  const { accountBalance, riskPerTradePct, entryPrice, stopPrice } = args;
  if (accountBalance <= 0 || riskPerTradePct <= 0 || entryPrice <= 0 || stopPrice <= 0) {
    return { positionSize: 0, notional: 0, riskAmount: 0, stopDistancePct: 0, feasible: false, warning: 'Bitte alle Felder ausfüllen.' };
  }
  if (stopPrice >= entryPrice) {
    return { positionSize: 0, notional: 0, riskAmount: 0, stopDistancePct: 0, feasible: false, warning: 'Stop muss unter dem Einstieg liegen (Long).' };
  }
  const riskAmount = accountBalance * (riskPerTradePct / 100);
  const perUnitRisk = entryPrice - stopPrice;
  const positionSize = riskAmount / perUnitRisk;
  const notional = positionSize * entryPrice;
  const stopDistancePct = ((entryPrice - stopPrice) / entryPrice) * 100;
  let warning: string | undefined;
  if (notional > accountBalance) warning = `Position-Größe (${notional.toFixed(0)}) übersteigt Account-Balance — Hebel wäre nötig oder Stop näher setzen.`;
  if (stopDistancePct > 10) warning = `Stop ${stopDistancePct.toFixed(1)}% entfernt — sehr weit, Position wird klein.`;
  return { positionSize, notional, riskAmount, stopDistancePct, feasible: true, warning };
}

export interface RewardRiskResult {
  rrTp1: number;
  rrTp2: number | null;
  riskPct: number;
  rewardPct1: number;
  rewardPct2: number | null;
  verdict: 'sehr gut' | 'gut' | 'ok' | 'schwach' | 'ungeeignet';
}

export function rewardRisk(args: {
  entry: number;
  stop: number;
  target1: number;
  target2?: number;
}): RewardRiskResult {
  const { entry, stop, target1, target2 } = args;
  const riskAbs = entry - stop;
  if (riskAbs <= 0) {
    return { rrTp1: 0, rrTp2: null, riskPct: 0, rewardPct1: 0, rewardPct2: null, verdict: 'ungeeignet' };
  }
  const reward1 = target1 - entry;
  const rr1 = reward1 / riskAbs;
  const rr2 = target2 !== undefined ? (target2 - entry) / riskAbs : null;
  const riskPct = (riskAbs / entry) * 100;
  const rewardPct1 = (reward1 / entry) * 100;
  const rewardPct2 = target2 !== undefined ? ((target2 - entry) / entry) * 100 : null;

  let verdict: RewardRiskResult['verdict'];
  if (rr1 >= 3) verdict = 'sehr gut';
  else if (rr1 >= 2) verdict = 'gut';
  else if (rr1 >= 1.5) verdict = 'ok';
  else if (rr1 >= 1) verdict = 'schwach';
  else verdict = 'ungeeignet';

  return { rrTp1: rr1, rrTp2: rr2, riskPct, rewardPct1, rewardPct2, verdict };
}

export interface KellyResult {
  kellyFraction: number;  // 0..1 raw Kelly
  halfKelly: number;      // halved for safety
  feasible: boolean;
  warning?: string;
}

// Kelly: f* = (p * b - (1 - p)) / b, where p = win rate, b = win/loss ratio
export function kellyFraction(args: { winRatePct: number; avgWinPct: number; avgLossPct: number }): KellyResult {
  const { winRatePct, avgWinPct, avgLossPct } = args;
  if (winRatePct <= 0 || winRatePct >= 100 || avgWinPct <= 0 || avgLossPct <= 0) {
    return { kellyFraction: 0, halfKelly: 0, feasible: false, warning: 'Win-Rate, Ø Gewinn und Ø Verlust müssen positiv sein.' };
  }
  const p = winRatePct / 100;
  const b = avgWinPct / avgLossPct;
  const f = (p * b - (1 - p)) / b;
  if (f <= 0) {
    return { kellyFraction: 0, halfKelly: 0, feasible: true, warning: 'Strategie hat keinen Edge — Kelly-Empfehlung ist 0 (nicht handeln).' };
  }
  return {
    kellyFraction: f,
    halfKelly: f / 2,
    feasible: true,
    warning: f > 0.25 ? 'Voller Kelly über 25% ist auch für Profis riskant — Half-Kelly oder weniger sicherer.' : undefined
  };
}
