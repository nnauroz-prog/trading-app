export interface FearGreedSnapshot {
  value: number;
  classification: string;
  timestamp: number;
}

export interface BtcDominanceSnapshot {
  btcDominancePct: number;
  ethDominancePct: number;
  totalMarketCapUsd: number;
  marketCapChange24hPct: number;
  timestamp: number;
}

interface FearGreedRaw {
  data?: Array<{ value: string; value_classification: string; timestamp: string }>;
}

interface CoinGeckoGlobalRaw {
  data?: {
    market_cap_percentage?: Record<string, number>;
    total_market_cap?: Record<string, number>;
    market_cap_change_percentage_24h_usd?: number;
  };
}

export async function fetchFearGreed(): Promise<FearGreedSnapshot | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as FearGreedRaw;
    const latest = data.data?.[0];
    if (!latest) return null;
    return {
      value: parseInt(latest.value, 10),
      classification: latest.value_classification,
      timestamp: parseInt(latest.timestamp, 10) * 1000
    };
  } catch {
    return null;
  }
}

export async function fetchBtcDominance(): Promise<BtcDominanceSnapshot | null> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as CoinGeckoGlobalRaw;
    const mcPct = data.data?.market_cap_percentage;
    const totalMc = data.data?.total_market_cap?.usd ?? 0;
    if (!mcPct || mcPct.btc === undefined) return null;
    return {
      btcDominancePct: mcPct.btc,
      ethDominancePct: mcPct.eth ?? 0,
      totalMarketCapUsd: totalMc,
      marketCapChange24hPct: data.data?.market_cap_change_percentage_24h_usd ?? 0,
      timestamp: Date.now()
    };
  } catch {
    return null;
  }
}
