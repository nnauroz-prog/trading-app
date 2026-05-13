alter table recommendations
  add constraint recommendations_report_asset_unique unique (report_date, asset_id);

create index if not exists idx_recommendations_report_date on recommendations (report_date);
create index if not exists idx_price_snapshots_asset_time on price_snapshots (asset_id, snapshot_time desc);
create index if not exists idx_reviews_review_date on recommendation_reviews (review_date);
