import { NextResponse } from 'next/server';
import { persistDailyRun, runDailyReview } from '@/lib/server/report-store';

export async function GET() {
  const reportDate = new Date().toISOString().slice(0, 10);
  const persistResult = await persistDailyRun(reportDate);
  const reviewResult = await runDailyReview(reportDate);

  return NextResponse.json({
    ok: true,
    date: reportDate,
    source: persistResult.persisted ? 'database+mock' : 'mock',
    persisted: persistResult.persisted,
    persistenceReason: persistResult.persisted ? null : persistResult.reason,
    review: reviewResult,
    report: persistResult.report,
    warning: persistResult.persisted ? null : 'Supabase env missing; persisted skipped.'
  });
}
