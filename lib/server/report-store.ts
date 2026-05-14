import { mockAssets } from '@/lib/data/mock';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { evaluateDirection } from '@/lib/review/evaluator';
import { getSnapshots } from '@/lib/providers';

export async function persistDailyRun(reportDate: string) {
  const supabase = getSupabaseAdmin();
  const report = await runDailyAnalysis();

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
    entry_price: report.snapshots[r.assetId]?.price ?? null,
    rationale: r.rationale,
    confidence_score: r.confidence,
    hold_duration: r.holdDuration,
    risk_level: r.riskLevel,
    status: 'open'
  }));

  await supabase.from('recommendations').upsert(recommendations, { onConflict: 'report_date,asset_id' });

  await supabase.from('price_snapshots').insert(
    Object.values(report.snapshots).map((s) => ({
      asset_id: s.assetId,
      snapshot_time: new Date().toISOString(),
      price: s.price,
      change_24h: s.change24h,
      change_7d: s.change7d,
      change_30d: s.change30d,
      volume: s.volume,
      source: s.source
    }))
  );

  return { report, persisted: true as const };
}

export async function runDailyReview(reportDate: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { reviewed: false, reason: 'missing_supabase_env' as const };
  }

  const yesterdayStr = shiftIsoDate(reportDate, -1);

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id,action,asset_id,entry_price')
    .eq('report_date', yesterdayStr);

  if (!recs?.length) return { reviewed: true, inserted: 0, yesterday: yesterdayStr };

  const snapshots = await getSnapshots();

  const reviews = recs.map((rec) => {
    const nowPrice = snapshots[rec.asset_id]?.price ?? rec.entry_price ?? 0;
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

  await supabase.from('recommendation_reviews').upsert(reviews, { onConflict: 'recommendation_id,review_date' });

  return { reviewed: true, inserted: reviews.length, yesterday: yesterdayStr };
}

export interface HitRateSummary {
  hitRate7d: number | null;
  hitRate30d: number | null;
  sampleSize7d: number;
  sampleSize30d: number;
}

export async function getHitRates(referenceDate = new Date().toISOString().slice(0, 10)): Promise<HitRateSummary | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const since30 = shiftIsoDate(referenceDate, -30);

  const { data, error } = await supabase
    .from('recommendation_reviews')
    .select('review_date, direction_correct')
    .gte('review_date', since30)
    .lte('review_date', referenceDate)
    .not('direction_correct', 'is', null);

  if (error || !data) return null;

  const since7 = shiftIsoDate(referenceDate, -7);
  const window7 = data.filter((r) => r.review_date >= since7);

  return {
    hitRate7d: ratio(window7),
    hitRate30d: ratio(data),
    sampleSize7d: window7.length,
    sampleSize30d: data.length
  };
}

function ratio(rows: { direction_correct: boolean | null }[]): number | null {
  if (rows.length === 0) return null;
  const hits = rows.filter((r) => r.direction_correct === true).length;
  return hits / rows.length;
}

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}
