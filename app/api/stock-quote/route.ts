import { NextRequest, NextResponse } from 'next/server';
import { fetchStockQuoteBySymbol } from '@/lib/providers/finnhub';
import { resolveStockSymbol } from '@/lib/data/stock-symbols';

export async function GET(request: NextRequest) {
  const underlying = request.nextUrl.searchParams.get('underlying');
  if (!underlying) {
    return NextResponse.json({ ok: false, error: 'missing_underlying' }, { status: 400 });
  }
  const symbol = resolveStockSymbol(underlying);
  if (!symbol) {
    return NextResponse.json({ ok: true, verified: false, reason: 'no_symbol_mapping', quote: null });
  }
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json({ ok: true, verified: false, reason: 'no_api_key', symbol, quote: null });
  }
  const quote = await fetchStockQuoteBySymbol(symbol);
  if (!quote) {
    return NextResponse.json({ ok: true, verified: false, reason: 'no_data', symbol, quote: null });
  }
  return NextResponse.json({ ok: true, verified: true, symbol, quote });
}
