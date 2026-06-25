-- Move budget finder: RTMS raw-ish deal rows for recent transaction search.
-- Keep only the fields needed for filtering and display; raw preserves API variance.

create table if not exists public.demand_rtms_deals (
  id bigserial primary key,
  source text not null default 'rtms',
  housing_type text not null check (housing_type in ('apartment', 'villa', 'officetel', 'detached_multi')),
  deal_type text not null check (deal_type in ('sale', 'jeonse', 'monthly')),
  region_key text not null,
  city_id text not null,
  city_label text not null,
  district_slug text not null,
  district_label text not null,
  lawd_cd text not null,
  dong text not null default '',
  building_name text not null default '',
  deal_yyyymm text not null check (deal_yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  deal_date date not null,
  deal_day integer not null check (deal_day between 1 and 31),
  amount_krw bigint not null check (amount_krw >= 0),
  monthly_rent_krw bigint check (monthly_rent_krw is null or monthly_rent_krw >= 0),
  area_sqm numeric(10, 2),
  floor integer,
  build_year integer,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_demand_rtms_deals_unique
  on public.demand_rtms_deals (
    housing_type,
    deal_type,
    lawd_cd,
    dong,
    building_name,
    deal_date,
    area_sqm,
    floor,
    amount_krw,
    monthly_rent_krw
  )
  nulls not distinct;

create index if not exists idx_demand_rtms_deals_filter
  on public.demand_rtms_deals (housing_type, deal_type, deal_date desc, amount_krw);

create index if not exists idx_demand_rtms_deals_region
  on public.demand_rtms_deals (region_key, deal_date desc);

alter table public.demand_rtms_deals enable row level security;

drop policy if exists demand_rtms_deals_public_read on public.demand_rtms_deals;
create policy demand_rtms_deals_public_read on public.demand_rtms_deals
  for select
  using (true);
