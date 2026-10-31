import { NextRequest, NextResponse } from 'next/server';
import { GamePredictionError, getGamePrediction } from '@/lib/sport/game-prediction';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function GET(request: NextRequest) {
  try {
    const result = await getGamePrediction(request.nextUrl.searchParams.get('sport') ?? '', request.nextUrl.searchParams.get('id') ?? '');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof GamePredictionError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'provider_unavailable', message: 'Die Prognose konnte nicht geladen werden.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
