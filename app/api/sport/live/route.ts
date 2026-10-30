import { NextRequest, NextResponse } from 'next/server';
import { getLiveScoreboard, LIVE_SPORTS, type LiveSport } from '@/lib/sport/live-scoreboard';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') ?? 'football';
  if (!Object.hasOwn(LIVE_SPORTS, sport)) return NextResponse.json({ error: 'unknown_sport' }, { status: 400 });
  const result = await getLiveScoreboard(sport as LiveSport);
  return NextResponse.json(result, { status: result.fetchedAt ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
