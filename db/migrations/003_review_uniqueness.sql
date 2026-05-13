alter table recommendation_reviews
  add constraint recommendation_reviews_recommendation_date_unique unique (recommendation_id, review_date);
