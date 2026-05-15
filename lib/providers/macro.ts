const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }> | null;
  };
}

export async function fetchMacroContext(): Promise<number | null> {
  const vix = await fetchLatestClose('^VIX');
  if (vix === null) return null;
  return scoreVix(vix);
}

export function scoreVix(vix: number): number {
  if (vix < 15) return 70;
  if (vix < 20) return 60;
  if (vix < 25) return 50;
  if (vix < 30) return 40;
  if (vix < 40) return 30;
  return 20;
}

async function fetchLatestClose(symbol: string): Promise<number | null> {
  const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (trading-app)' },
      next: { revalidate: 900 }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    const closes = (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [])
      .filter((v): v is number => typeof v === 'number');
    if (closes.length === 0) return null;
    return closes[closes.length - 1];
  } catch {
    return null;
  }
}
