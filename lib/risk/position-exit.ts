import { Position } from '@/lib/types/positions';

export type ExitVerdict = 'STOP_HIT' | 'TARGET_HIT' | 'TRAIL_STOP' | 'NEAR_STOP' | 'HOLD';

export interface ExitSignal {
  verdict: ExitVerdict;
  action: string;
  detail: string;
  tone: 'sell' | 'trim' | 'caution' | 'hold';
}

function fmtNum(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(7);
}

// Plain-language exit verdict for an open long position given its live price.
// Returns null for closed positions or when no live price is available.
export function evaluatePositionExit(position: Position, currentPrice: number | null): ExitSignal | null {
  if (position.status !== 'open' || currentPrice === null || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return null;
  }

  const entry = position.entryPrice;
  const stop = position.stopLossPlanned;
  const target = position.takeProfitPlanned;
  const gainPct = ((currentPrice - entry) / entry) * 100;

  if (stop !== null && stop > 0 && currentPrice <= stop) {
    return {
      verdict: 'STOP_HIT',
      action: 'VERKAUFEN',
      detail: `Stop bei ${fmtNum(stop)} erreicht (aktuell ${fmtNum(currentPrice)}). Plan einhalten und raus — nicht „nur noch kurz" abwarten.`,
      tone: 'sell'
    };
  }

  if (target !== null && target > 0 && currentPrice >= target) {
    return {
      verdict: 'TARGET_HIT',
      action: 'GEWINN SICHERN',
      detail: `Ziel ${fmtNum(target)} erreicht (+${gainPct.toFixed(1)}%). Teilverkauf erwägen (z.B. 50%) und Stop für den Rest auf den Einstieg nachziehen.`,
      tone: 'trim'
    };
  }

  const halfway = target !== null && target > entry ? entry + 0.5 * (target - entry) : null;
  const inGoodProfit = halfway !== null ? currentPrice >= halfway : gainPct >= 5;
  if (inGoodProfit && (stop === null || stop < entry)) {
    return {
      verdict: 'TRAIL_STOP',
      action: 'STOP NACHZIEHEN',
      detail: `Gut im Plus (+${gainPct.toFixed(1)}%). Stop auf den Einstieg (${fmtNum(entry)}) ziehen — ab hier läuft die Position risikofrei.`,
      tone: 'caution'
    };
  }

  if (stop !== null && stop > 0 && currentPrice <= stop * 1.015) {
    const aboveStopPct = ((currentPrice - stop) / stop) * 100;
    return {
      verdict: 'NEAR_STOP',
      action: 'HALTEN — nah am Stop',
      detail: `Kurs nur ${aboveStopPct.toFixed(1)}% über dem Stop. Reißt er, konsequent verkaufen — nicht nachverhandeln.`,
      tone: 'caution'
    };
  }

  if (stop === null || stop <= 0) {
    return {
      verdict: 'HOLD',
      action: 'HALTEN — aber Stop fehlt',
      detail: `Kein Stop gesetzt — du hast keinen definierten Ausstieg nach unten. Lege einen fest.`,
      tone: 'caution'
    };
  }

  return {
    verdict: 'HOLD',
    action: 'HALTEN',
    detail:
      gainPct >= 0
        ? `Im Plan (+${gainPct.toFixed(1)}%), zwischen Einstieg und Ziel. Laufen lassen, Stop respektieren.`
        : `Im Minus (${gainPct.toFixed(1)}%), aber über dem Stop. These gilt, bis der Stop reißt.`,
    tone: 'hold'
  };
}
