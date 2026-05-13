import { mockAssets, mockSnapshots } from '@/lib/data/mock';
import { getSupabaseAdmin } from '@/lib/supabase';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { evaluateDirection } from '@/lib/review/evaluator';

export async function persistDailyRun(reportDate: string) {
  const supabase = getSupabaseAdmin();
  const report = runDailyAnalysis();

  if (!supabase) {
    return { report, persisted: false, reason: 'missing_supabase_env' as const };
  }

  await supabase.from('assets').upsert(
    mockAssets.map((a) => ({
      id: a.id,
      ticker: a.ticker,
      name: a.name,
      category: a.category,
      tradable_on_bitpanda: a.venueAvailability.includes('Bitpanda'),
      tradable_on_scalable: a.venueAvailability.includes('Scalable')
    })),
    { onConflict: 'id' }
  );

  await supabase.from('daily_market_reports').upsert(
    { report_date: reportDate, market_mood: report.marketMood, summary: 'Automatisch erzeugter Tagesbericht (Mock/Live je nach Provider).' },
    { onConflict: 'report_date' }
  );

  const recommendations = report.recommendations.map((r) => ({
    report_date: reportDate,
    asset_id: r.assetId,
    action: r.action,
    entry_price: mockSnapshots[r.assetId]?.price ?? null,
    rationale: r.rationale,
    confidence_score: r.confidence,
    hold_duration: r.holdDuration,
    risk_level: r.riskLevel,
    status: 'open'
  }));

  await supabase.from('recommendations').insert(recommendations);

  await supabase.from('price_snapshots').insert(
    Object.values(mockSnapshots).map((s) => ({
      asset_id: s.assetId,
      snapshot_time: new Date().toISOString(),
      price: s.price,
      change_24h: s.change24h,
      change_7d: s.change7d,
      change_30d: s.change30d,
      volume: s.volume,
      source: 'mock'
    }))
  );

  return { report, persisted: true as const };
}

export async function runDailyReview(reportDate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { reviewed: false, reason: 'missing_supabase_env' as const };
  }

  const yesterday = new Date(reportDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id,action,asset_id,entry_price')
    .eq('report_date', yesterdayStr);

  if (!recs?.length) return { reviewed: true, inserted: 0, yesterday: yesterdayStr };

  const reviews = recs.map((rec) => {
    const nowPrice = mockSnapshots[rec.asset_id]?.price ?? rec.entry_price ?? 0;
    const entry = rec.entry_price ?? nowPrice;
    const movePct = entry === 0 ? 0 : ((nowPrice - entry) / entry) * 100;
    const result = evaluateDirection(rec.action, movePct);
    return {
      recommendation_id: rec.id,
      review_date: reportDate,
      direction_correct: result.correct,
      verdict: result.verdict,
      learning: result.learning
    };
  });

  await supabase.from('recommendation_reviews').insert(reviews);

  return { reviewed: true, inserted: reviews.length, yesterday: yesterdayStr };
}
