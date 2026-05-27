import { Moneyness, MoneynessAnalysis } from '@/lib/types/ideas';

export function classifyMoneyness(
  underlyingPrice: number,
  strike: number,
  direction: 'call' | 'put' = 'call'
): MoneynessAnalysis {
  if (!Number.isFinite(underlyingPrice) || !Number.isFinite(strike) || strike <= 0) {
    return { classification: 'unknown', distancePct: 0, description: 'Kein Strike-Vergleich möglich' };
  }
  const distancePct = ((underlyingPrice - strike) / strike) * 100;
  let classification: Moneyness;
  let description: string;

  const inMoney = direction === 'call' ? distancePct > 0 : distancePct < 0;
  const absDist = Math.abs(distancePct);

  if (absDist < 2) {
    classification = 'atm';
    description = `Am Geld (Abstand ${distancePct.toFixed(1)}%)`;
  } else if (inMoney) {
    classification = 'itm';
    description = `Im Geld (Abstand ${distancePct.toFixed(1)}%)`;
  } else if (absDist > 25) {
    classification = 'deep_otm';
    description = `Deutlich aus dem Geld (Strike ${absDist.toFixed(1)}% entfernt) — sehr spekulativ`;
  } else {
    classification = 'otm';
    description = `Aus dem Geld (Strike ${absDist.toFixed(1)}% entfernt)`;
  }
  return { classification, distancePct, description };
}
