-- Demand pipeline foundation (Phase 1)
-- Store only numeric snapshots used by /demand.

create table if not exists public.demand_rtms_monthly (
  id bigserial primary key,
  region_scope text not null check (region_scope in ('national', 'city', 'district')),
  region_key text not null,
  yyyymm text not null check (yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  sale_count integer not null default 0 check (sale_count >= 0),
  jeonse_count integer not null default 0 check (jeonse_count >= 0),
  source text not null default 'rtms',
  updated_at timestamptz not null default now(),
  unique (region_scope, region_key, yyyymm)
);

create table if not exists public.demand_keyword_daily (
  id bigserial primary key,
  keyword_key text not null check (keyword_key in ('packing', 'move_in_clean')),
  period_date date not null,
  index_ratio numeric(8,2) not null default 0,
  source text not null default 'datalab',
  updated_at timestamptz not null default now(),
  unique (keyword_key, period_date)
);

create table if not exists public.demand_keyword_monthly (
  id bigserial primary key,
  keyword_key text not null check (keyword_key in ('packing', 'move_in_clean')),
  yyyymm text not null check (yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  search_volume_month integer,
  search_volume_below_ten boolean not null default false,
  index_mom_percent numeric(8,2) not null default 0,
  source text not null default 'searchad',
  updated_at timestamptz not null default now(),
  unique (keyword_key, yyyymm)
);

create table if not exists public.demand_gu_scores (
  id bigserial primary key,
  gu_slug text not null,
  yyyymm text not null check (yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  score numeric(8,2) not null,
  rank integer not null check (rank > 0),
  rank_delta integer not null default 0,
  signal text not null check (signal in ('strong', 'neutral', 'weak')),
  updated_at timestamptz not null default now(),
  unique (gu_slug, yyyymm)
);

create index if not exists idx_demand_rtms_monthly_region_period
  on public.demand_rtms_monthly (region_scope, region_key, yyyymm desc);

create index if not exists idx_demand_keyword_daily_key_date
  on public.demand_keyword_daily (keyword_key, period_date desc);

create index if not exists idx_demand_keyword_monthly_key_period
  on public.demand_keyword_monthly (keyword_key, yyyymm desc);

create index if not exists idx_demand_gu_scores_period_rank
  on public.demand_gu_scores (yyyymm desc, rank asc);
