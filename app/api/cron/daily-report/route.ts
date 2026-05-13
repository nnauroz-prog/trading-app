import { NextResponse } from 'next/server';
import { runDailyAnalysis } from '@/lib/analysis/engine';

export async function GET() {
  const report = runDailyAnalysis();
  // TODO: Persist to Supabase/Postgres (daily_market_reports, recommendations, signals, snapshots).
  return NextResponse.json({ ok: true, report, source: 'mock', warning: 'No API keys configured; using mock data.' });
}
