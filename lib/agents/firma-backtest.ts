import { unstable_cache } from 'next/cache';
import { fetchBacktestCandles, runStrategyBacktestOnCandles } from '@/lib/analysis/strategy-backtest';
import { paramsFor } from '@/lib/agents/firma-params';
import { PersonaId } from '@/lib/agents/personas';

export interface FirmaBacktestRow {
  firma: PersonaId;
  firmaName: string;
  trades: number;
  winRatePct: number | null;
  netReturnPct: number;
  expectancyPct: number;
  periodDays: number;
}

export interface FirmaBacktestReport {
  rows: FirmaBacktestRow[];
  generatedAt: string;
}

const NAMES: Record<PersonaId, string> = {
  conservative: 'Konservativ',
  balanced: 'Balanciert',
  aggressive: 'Aggressiv'
};

async function compute(): Promise<FirmaBacktestReport> {
  const candles = await fetchBacktestCandles(['btc', 'eth', 'sol']);
  const rows: FirmaBacktestRow[] = (['conservative', 'balanced', 'aggressive'] as PersonaId[]).map((firma) => {
    const report = runStrategyBacktestOnCandles(candles, paramsFor(firma));
    return {
      firma,
      firmaName: NAMES[firma],
      trades: report.combined.totalSignals,
      winRatePct: report.combined.winRate !== null ? Math.round(report.combined.winRate * 1000) / 10 : null,
      netReturnPct: Math.round(report.combined.netReturnPct * 10) / 10,
      expectancyPct: Math.round(report.combined.expectancyPct * 100) / 100,
      periodDays: report.periodDays
    };
  });
  return { rows, generatedAt: new Date().toISOString() };
}

// Cache for 30 minutes — backtest is expensive and per-firma params don't
// change minute-to-minute.
export const getFirmaBacktest = unstable_cache(compute, ['firma-backtest-v1'], { revalidate: 1800 });
