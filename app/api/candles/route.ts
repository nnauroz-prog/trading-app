import { NextRequest, NextResponse } from 'next/server';
import { fetchCandles, fetchKlinesBySymbol } from '@/lib/providers/binance';
import { binanceSymbolByAssetId } from '@/lib/data/mock';
import { getCoinById } from '@/lib/coin-universe';

const VALID_INTERVALS = ['15m', '1h', '4h', '1d', '1w'] as const;
type Interval = (typeof VALID_INTERVALS)[number];

function isInterval(v: string): v is Interval {
  return (VALID_INTERVALS as readonly string[]).includes(v);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const assetId = params.get('assetId');
  const intervalParam = params.get('interval') ?? '1h';
  const limitParam = parseInt(params.get('limit') ?? '200', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 200;

  if (!assetId) return NextResponse.json({ ok: false, error: 'missing_assetId' }, { status: 400 });
  if (!isInterval(intervalParam)) return NextResponse.json({ ok: false, error: 'invalid_interval' }, { status: 400 });

  const interval = intervalParam;
  const fromMock = binanceSymbolByAssetId[assetId];
  const symbol = fromMock ?? getCoinById(assetId)?.binanceSymbol;
  if (!symbol) return NextResponse.json({ ok: false, error: 'unknown_asset' }, { status: 400 });

  const candles = interval === '1h' || interval === '4h'
    ? await fetchCandles(assetId, interval, limit)
    : await fetchKlinesBySymbol(symbol, interval, limit);
  if (!candles) return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 });

  return NextResponse.json({ ok: true, candles, interval, count: candles.length });
}
