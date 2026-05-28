export interface FundingRateSnapshot {
  symbol: string;
  fundingRate: number;
  fundingRateAnnualizedPct: number;
  fundingTime: number;
}

interface BybitFundingRaw {
  retCode: number;
  result?: {
    list?: Array<{ symbol: string; fundingRate: string; fundingRateTimestamp: string }>;
  };
}

export async function fetchFundingRate(symbol: string): Promise<FundingRateSnapshot | null> {
  try {
    const url = `https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${symbol}&limit=1`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as BybitFundingRaw;
    if (data.retCode !== 0) return null;
    const latest = data.result?.list?.[0];
    if (!latest) return null;
    const rate = parseFloat(latest.fundingRate);
    return {
      symbol: latest.symbol,
      fundingRate: rate,
      fundingRateAnnualizedPct: rate * 100 * 3 * 365,
      fundingTime: parseInt(latest.fundingRateTimestamp, 10)
    };
  } catch {
    return null;
  }
}

export async function fetchFundingRates(symbols: string[]): Promise<Record<string, FundingRateSnapshot | null>> {
  const entries = await Promise.all(
    symbols.map(async (s) => [s, await fetchFundingRate(s)] as const)
  );
  return Object.fromEntries(entries);
}
