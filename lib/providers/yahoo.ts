import { PriceSnapshot } from '@/lib/types/domain';
import { finnhubSymbolByAssetId } from '@/lib/data/mock';

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }> | null;
    error?: unknown;
  };
}

export async function fetchStockSnapshots(): Promise<Record<string, PriceSnapshot> | null> {
  const entries = Object.entries(finnhubSymbolByAssetId);
  const results = await Promise.all(entries.map(([assetId, symbol]) => fetchOne(assetId, symbol)));
  const map: Record<string, PriceSnapshot> = {};
  for (const snapshot of results) {
    if (snapshot) map[snapshot.assetId] = snapshot;
  }
  return Object.keys(map).length > 0 ? map : null;
}

async function fetchOne(assetId: string, symbol: string): Promise<PriceSnapshot | null> {
  const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?range=3mo&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (trading-app)' },
      next: { revalidate: 900 }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((v): v is number => typeof v === 'number');
    const volumes = (result.indicators?.quote?.[0]?.volume ?? []).filter((v): v is number => typeof v === 'number');
    if (closes.length < 22) return null;

    const last = closes[closes.length - 1];
    const dayAgo = closes[closes.length - 2];
    const weekAgo = closes[closes.length - 6];
    const monthAgo = closes[closes.length - 22];
    const lastVolume = volumes[volumes.length - 1] ?? 0;
    const recentVolumes = volumes.slice(-22, -1);
    const avgVolume = recentVolumes.length > 0
      ? recentVolumes.reduce((s, v) => s + v, 0) / recentVolumes.length
      : 0;
    const volumeRatio = avgVolume > 0 ? lastVolume / avgVolume : null;

    return {
      assetId,
      price: last,
      change24h: pct(last, dayAgo),
      change7d: pct(last, weekAgo),
      change30d: pct(last, monthAgo),
      volume: lastVolume,
      volumeRatio,
      source: 'yahoo'
    };
  } catch {
    return null;
  }
}

function pct(now: number, before: number | undefined): number {
  if (!before || before === 0) return 0;
  return ((now - before) / before) * 100;
}
