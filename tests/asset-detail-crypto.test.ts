import { isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSnapshots: vi.fn(), runDailyAnalysis: vi.fn(), fetchAllTickers: vi.fn(), getMasterSignal: vi.fn(), mode: 'daytrade'
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: mocks.mode }) }) }));
vi.mock('@/lib/providers', () => ({ getSnapshots: mocks.getSnapshots }));
vi.mock('@/lib/analysis/engine', () => ({ runDailyAnalysis: mocks.runDailyAnalysis }));
vi.mock('@/lib/providers/binance-tickers', () => ({ fetchAllTickers: mocks.fetchAllTickers }));
vi.mock('@/lib/analysis/master-signal-engine', () => ({ getMasterSignal: mocks.getMasterSignal }));
vi.mock('@/lib/providers/binance', () => ({ fetchKlinesBySymbol: async () => null }));
vi.mock('@/lib/providers/sentiment', () => ({ fetchAssetHeadlines: async () => [] }));
vi.mock('@/lib/news/news-agent', () => ({ getCryptoNews: async () => [] }));
vi.mock('@/lib/analysis/backtest-summary', () => ({ getBacktestSummary: async () => ({ available: false, trades: 0, winRatePct: null, netReturnPct: 0, periodDays: 0, perAssetEdge: {}, safeTier: null, btcHodlReturnPct: null, safeTrades: [] }) }));
vi.mock('@/lib/agents/personas', () => ({ evaluatePersonas: () => [], evaluatePersonasForCoin: () => [] }));

import AssetDetail from '@/app/assets/[ticker]/page';
import { DataQualityBadge } from '@/components/data-quality-badge';

function elements(node: ReactNode): Array<{ type: unknown; props: Record<string, unknown> }> {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [{ type: node.type, props: node.props }, ...elements(node.props.children)];
}
function textContent(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(textContent).join(' ');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return textContent(node.props.children);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mode = 'daytrade';
  mocks.getSnapshots.mockResolvedValue({ btc: { assetId: 'btc', price: 66350, change24h: 1, change7d: 1, change30d: 1, volume: 1, source: 'mock' } });
  mocks.runDailyAnalysis.mockResolvedValue({ recommendations: [] });
  mocks.fetchAllTickers.mockResolvedValue(new Map([['BTCUSDT', { symbol: 'BTCUSDT', binanceSymbol: 'BTCUSDT', price: 110, priceChangePct: 2, high: 120, low: 100, volume: 10, quoteVolume: 1100, source: 'kraken' }]]));
  mocks.getMasterSignal.mockResolvedValue({ kind: 'no_trade', bestCandidate: null, marketRegime: 'sideways', btcRegime: 'sideways', marketStructure: 'range', crowd: { state: 'neutral', cautious: false, detail: 'Neutral' }, marketMood: 'neutral', reasons: [], mode: 'daytrade', candidates: [], generatedAt: new Date().toISOString() });
});

describe('crypto detail page across the legacy metadata catalog', () => {
  it('uses a real ticker fallback for BTC and the same trade-mode cookie as home', async () => {
    const tree = await AssetDetail({ params: Promise.resolve({ ticker: 'btc' }) });
    expect(mocks.fetchAllTickers).toHaveBeenCalledOnce();
    expect(mocks.getMasterSignal).toHaveBeenCalledWith('daytrade');
    expect(mocks.runDailyAnalysis).not.toHaveBeenCalled();
    const badge = elements(tree).find(element => element.type === DataQualityBadge);
    expect(badge?.props.source).toBe('kraken');
    expect(badge?.props.verified).toBe(true);
  });
  it('uses swing as the default for every crypto coin', async () => {
    mocks.mode = '';
    await AssetDetail({ params: Promise.resolve({ ticker: 'eth' }) });
    expect(mocks.getMasterSignal).toHaveBeenCalledWith('swing');
    expect(mocks.fetchAllTickers).toHaveBeenCalledOnce();
  });
  it('preserves stock detail behavior without launching crypto analysis', async () => {
    await AssetDetail({ params: Promise.resolve({ ticker: 'nvda' }) });
    expect(mocks.getMasterSignal).not.toHaveBeenCalled();
    expect(mocks.fetchAllTickers).not.toHaveBeenCalled();
    expect(mocks.runDailyAnalysis).toHaveBeenCalledOnce();
  });
  it('sends raw crypto candidates to the shared buy check without creating a weaker buy signal', async () => {
    mocks.getMasterSignal.mockResolvedValueOnce({
      candidates: [{ coinId: 'btc', symbol: 'BTC', entry: 110, stopLoss: 100, takeProfit1: 125, takeProfit2: 140, reasons: ['INTERNAL_RAW_CANDIDATE'] }],
      generatedAt: new Date().toISOString()
    });
    const tree = await AssetDetail({ params: Promise.resolve({ ticker: 'btc' }) });
    const text = textContent(tree);
    const buyCheck = elements(tree).find(element => element.props.href === '/krypto' && textContent(element.props.children as ReactNode).includes('Kaufprüfung ansehen'));
    expect(buyCheck).toBeDefined();
    expect(text).toContain('Aktueller Preis');
    expect(text).toContain('110');
    expect(text).toContain('Käufe für heute');
    expect(text).not.toMatch(/KAUF-SIGNAL|INTERNAL_RAW_CANDIDATE|Konfluenz|Precision|Firmen|Trefferquote/);
  });
  it('does not display the example price when real crypto quotes are unavailable', async () => {
    mocks.fetchAllTickers.mockResolvedValueOnce(null);
    const tree = await AssetDetail({ params: Promise.resolve({ ticker: 'btc' }) });
    expect(textContent(tree)).toContain('Der aktuelle Preis ist gerade nicht verfügbar');
    expect(elements(tree).some(element => element.type === DataQualityBadge)).toBe(false);
    expect(textContent(tree)).not.toContain('66.350');
  });
});
