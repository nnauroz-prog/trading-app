import { mockAssets } from '@/lib/data/mock';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { runDailyAnalysis } from '@/lib/analysis/engine';
import { evaluateDirection } from '@/lib/review/evaluator';
import { getSnapshots } from '@/lib/providers';

const REVIEW_HORIZONS = [7, 30] as const;
export type ReviewHorizon = (typeof REVIEW_HORIZONS)[number];

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

  const snapshots = await getSnapshots();
  const perHorizon: Record<number, number> = {};
  let totalInserted = 0;

  for (const horizon of REVIEW_HORIZONS) {
    const targetDate = shiftIsoDate(reportDate, -horizon);
    const { data: recs } = await supabase
      .from('recommendations')
      .select('id,action,asset_id,entry_price')
      .eq('report_date', targetDate);

    if (!recs?.length) {
      perHorizon[horizon] = 0;
      continue;
    }

    const reviews = recs.map((rec) => {
      const nowPrice = snapshots[rec.asset_id]?.price ?? rec.entry_price ?? 0;
      const entry = rec.entry_price ?? nowPrice;
      const movePct = entry === 0 ? 0 : ((nowPrice - entry) / entry) * 100;
      const result = evaluateDirection(rec.action, movePct);
      return {
        recommendation_id: rec.id,
        review_date: reportDate,
        horizon_days: horizon,
        direction_correct: result.correct,
        verdict: result.verdict,
        learning: result.learning
      };
    });

    await supabase.from('recommendation_reviews').upsert(reviews, { onConflict: 'recommendation_id,review_date' });
    perHorizon[horizon] = reviews.length;
    totalInserted += reviews.length;
  }

  return { reviewed: true, inserted: totalInserted, perHorizon };
}

export interface HitRateBucket {
  rate: number | null;
  sampleSize: number;
}

export interface HitRateSummary {
  horizon7: HitRateBucket;
  horizon30: HitRateBucket;
}

export async function getHitRates(): Promise<HitRateSummary | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('recommendation_reviews')
    .select('horizon_days, direction_correct')
    .in('horizon_days', [...REVIEW_HORIZONS])
    .not('direction_correct', 'is', null);

  if (error || !data) return null;

  const bucketBy = (h: ReviewHorizon): HitRateBucket => {
    const rows = data.filter((r) => r.horizon_days === h);
    return { rate: ratio(rows), sampleSize: rows.length };
  };

  return {
    horizon7: bucketBy(7),
    horizon30: bucketBy(30)
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
