-- 004_review_horizon.sql
-- Track which holding-period horizon a review was taken at.
-- NULL = legacy 1-day review (excluded from horizon-bucketed hit rates).

alter table recommendation_reviews
  add column if not exists horizon_days int;

create index if not exists idx_reviews_horizon on recommendation_reviews (horizon_days);
