import { NextRequest, NextResponse } from 'next/server';
import { fetchCandles } from '@/lib/providers/binance';
import { binanceSymbolByAssetId } from '@/lib/data/mock';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const assetId = params.get('assetId');
  const sinceParam = params.get('since');
  if (!assetId || !sinceParam) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
  }
  const since = parseInt(sinceParam, 10);
  if (!Number.isFinite(since) || since <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_since' }, { status: 400 });
  }
  if (!binanceSymbolByAssetId[assetId]) {
    return NextResponse.json({ ok: false, error: 'unknown_asset' }, { status: 400 });
  }

  const candles = await fetchCandles(assetId, '1h', 500);
  if (!candles) {
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 });
  }
  const filtered = candles
    .filter((c) => c.openTime > since - 60 * 60 * 1000)
    .map((c) => ({ openTime: c.openTime, high: c.high, low: c.low, close: c.close }));
  return NextResponse.json({ ok: true, candles: filtered });
}
