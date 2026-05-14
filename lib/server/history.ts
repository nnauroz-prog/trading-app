import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { RecommendationAction } from '@/lib/types/domain';

export interface HistoryRow {
  reportDate: string;
  assetId: string;
  action: RecommendationAction;
  confidence: number | null;
  entryPrice: number | null;
  rationale: string;
  reviewVerdict: 'good' | 'bad' | 'neutral' | null;
  reviewHorizon: number | null;
  directionCorrect: boolean | null;
  learning: string | null;
}

export interface HistoryFilters {
  assetId?: string;
  action?: RecommendationAction;
  limit?: number;
}

interface SupabaseHistoryRow {
  report_date: string;
  asset_id: string | null;
  action: RecommendationAction;
  confidence_score: number | null;
  entry_price: number | null;
  rationale: string;
  recommendation_reviews?: Array<{
    review_date: string;
    horizon_days: number | null;
    verdict: 'good' | 'bad' | 'neutral' | null;
    direction_correct: boolean | null;
    learning: string | null;
  }> | null;
}

export async function getHistory(filters: HistoryFilters = {}): Promise<HistoryRow[] | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  let query = supabase
    .from('recommendations')
    .select('report_date, asset_id, action, confidence_score, entry_price, rationale, recommendation_reviews(review_date, horizon_days, verdict, direction_correct, learning)')
    .order('report_date', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.assetId) query = query.eq('asset_id', filters.assetId);
  if (filters.action) query = query.eq('action', filters.action);

  const { data, error } = await query;
  if (error || !data) return null;

  return (data as SupabaseHistoryRow[]).map((row) => {
    const latestReview = row.recommendation_reviews && row.recommendation_reviews.length > 0
      ? [...row.recommendation_reviews].sort((a, b) => b.review_date.localeCompare(a.review_date))[0]
      : null;
    return {
      reportDate: row.report_date,
      assetId: row.asset_id ?? '',
      action: row.action,
      confidence: row.confidence_score,
      entryPrice: row.entry_price,
      rationale: row.rationale,
      reviewVerdict: latestReview?.verdict ?? null,
      reviewHorizon: latestReview?.horizon_days ?? null,
      directionCorrect: latestReview?.direction_correct ?? null,
      learning: latestReview?.learning ?? null
    };
  });
}
