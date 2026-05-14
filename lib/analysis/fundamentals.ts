import { StockMetrics } from '@/lib/providers/finnhub';

export function scoreFundamentals(m: StockMetrics): number | null {
  const parts: number[] = [];
  if (m.pe !== null) parts.push(scorePE(m.pe));
  if (m.peg !== null) parts.push(scorePEG(m.peg));
  if (m.roe !== null) parts.push(scoreROE(m.roe));
  if (m.debtToEquity !== null) parts.push(scoreDebtToEquity(m.debtToEquity));
  if (parts.length === 0) return null;
  return Math.round(average(parts));
}

export function scoreEarningsGrowth(m: StockMetrics): number | null {
  const parts: number[] = [];
  if (m.epsGrowthYoy !== null) parts.push(scoreGrowth(m.epsGrowthYoy));
  if (m.revenueGrowthYoy !== null) parts.push(scoreGrowth(m.revenueGrowthYoy));
  if (parts.length === 0) return null;
  return Math.round(average(parts));
}

function scorePE(pe: number): number {
  if (pe < 0) return 30;
  if (pe <= 15) return 70;
  if (pe <= 25) return 55;
  if (pe <= 40) return 45;
  return 35;
}

function scorePEG(peg: number): number {
  if (peg <= 0) return 40;
  if (peg <= 1) return 70;
  if (peg <= 2) return 55;
  if (peg <= 3) return 45;
  return 35;
}

function scoreROE(roePercent: number): number {
  if (roePercent < 0) return 30;
  if (roePercent < 5) return 40;
  if (roePercent < 15) return 55;
  if (roePercent < 25) return 70;
  return 80;
}

function scoreDebtToEquity(de: number): number {
  if (de < 0.5) return 70;
  if (de < 1) return 60;
  if (de < 2) return 50;
  return 35;
}

function scoreGrowth(yoyPercent: number): number {
  if (yoyPercent < -10) return 25;
  if (yoyPercent < 0) return 40;
  if (yoyPercent < 10) return 55;
  if (yoyPercent < 25) return 70;
  return 80;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
