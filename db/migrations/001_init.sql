create table if not exists assets (
  id text primary key,
  ticker text not null unique,
  name text not null,
  category text not null check (category in ('crypto','stock','etf')),
  tradable_on_bitpanda boolean default false,
  tradable_on_scalable boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists daily_market_reports (
  id bigserial primary key,
  report_date date not null unique,
  market_mood text not null,
  summary text not null,
  hit_rate_7d numeric,
  hit_rate_30d numeric,
  created_at timestamptz default now()
);

create table if not exists recommendations (
  id bigserial primary key,
  report_date date not null,
  asset_id text references assets(id),
  action text not null check (action in ('BUY','HOLD','SELL','AVOID','WATCH')),
  entry_price numeric,
  rationale text not null,
  confidence_score int check (confidence_score between 0 and 100),
  hold_duration text,
  stop_loss numeric,
  take_profit numeric,
  risk_level text check (risk_level in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','fulfilled','failed','neutral')),
  created_at timestamptz default now()
);

create table if not exists recommendation_reviews (
  id bigserial primary key,
  recommendation_id bigint references recommendations(id),
  review_date date not null,
  direction_correct boolean,
  verdict text check (verdict in ('good','bad','neutral')),
  learning text,
  created_at timestamptz default now()
);

create table if not exists watchlist (
  id bigserial primary key,
  asset_id text references assets(id),
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists price_snapshots (
  id bigserial primary key,
  asset_id text references assets(id),
  snapshot_time timestamptz not null,
  price numeric not null,
  change_24h numeric,
  change_7d numeric,
  change_30d numeric,
  volume numeric,
  source text not null,
  created_at timestamptz default now()
);

create table if not exists signals (
  id bigserial primary key,
  report_date date not null,
  asset_id text references assets(id),
  signal_type text not null,
  value numeric not null,
  weight numeric not null,
  explanation text,
  created_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
