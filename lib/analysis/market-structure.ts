import { Candle } from '@/lib/types/domain';

export type Structure = 'uptrend' | 'downtrend' | 'range';

export interface StructureAssessment {
  structure: Structure;
  support: number | null;
  resistance: number | null;
  positionInRange: number | null; // 0 = at support, 1 = at resistance
  nearSupport: boolean;
  detail: string;
}

function pivots(candles: Candle[], lookback: number, kind: 'high' | 'low'): number[] {
  const out: number[] = [];
  for (let i = lookback; i <= candles.length - 1 - lookback; i++) {
    const v = kind === 'high' ? candles[i].high : candles[i].low;
    let isPivot = true;
    for (let j = 1; j <= lookback; j++) {
      const a = kind === 'high' ? candles[i - j].high : candles[i - j].low;
      const b = kind === 'high' ? candles[i + j].high : candles[i + j].low;
      if (kind === 'high' ? a > v || b > v : a < v || b < v) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) out.push(v);
  }
  return out;
}

const UNKNOWN: StructureAssessment = {
  structure: 'range',
  support: null,
  resistance: null,
  positionInRange: null,
  nearSupport: false,
  detail: 'Zu wenig Daten für eine Strukturanalyse.'
};

// Reads market structure from swing pivots: higher highs + higher lows = uptrend,
// lower highs + lower lows = downtrend, otherwise a range. Also locates the nearest
// support/resistance so we can tell whether price sits near support (good for a long)
// or is stretched toward resistance (chasing).
export function assessMarketStructure(candles: Candle[], lookback = 3): StructureAssessment {
  if (candles.length < lookback * 2 + 3) return UNKNOWN;

  const highs = pivots(candles, lookback, 'high');
  const lows = pivots(candles, lookback, 'low');
  const price = candles[candles.length - 1].close;

  const higherHigh = highs.length >= 2 ? highs[highs.length - 1] > highs[highs.length - 2] : null;
  const higherLow = lows.length >= 2 ? lows[lows.length - 1] > lows[lows.length - 2] : null;

  let structure: Structure = 'range';
  if (higherHigh === true && higherLow === true) structure = 'uptrend';
  else if (higherHigh === false && higherLow === false) structure = 'downtrend';

  const support = lows.length > 0 ? lows[lows.length - 1] : Math.min(...candles.slice(-lookback * 4).map((c) => c.low));
  const resistance = highs.length > 0 ? highs[highs.length - 1] : Math.max(...candles.slice(-lookback * 4).map((c) => c.high));

  let positionInRange: number | null = null;
  if (support !== null && resistance !== null && resistance > support) {
    positionInRange = Math.max(0, Math.min(1, (price - support) / (resistance - support)));
  }

  const nearSupport = positionInRange !== null && positionInRange <= 0.4;

  const structureText =
    structure === 'uptrend' ? 'Aufwärtsstruktur (höhere Hochs & Tiefs)' :
    structure === 'downtrend' ? 'Abwärtsstruktur (tiefere Hochs & Tiefs)' :
    'Seitwärts-Range';
  const placeText =
    positionInRange === null ? '' :
    nearSupport ? ' · Kurs nahe Unterstützung (guter Long-Bereich)' :
    positionInRange >= 0.8 ? ' · Kurs nahe Widerstand (Gefahr, dem Move hinterherzulaufen)' :
    ' · Kurs in der Mitte der Spanne';

  return { structure, support, resistance, positionInRange, nearSupport, detail: structureText + placeText };
}
