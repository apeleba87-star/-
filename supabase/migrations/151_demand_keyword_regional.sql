-- 지역별 검색 키워드(데이터랩·검색광고) — region_scope + region_key

alter table public.demand_keyword_daily
  add column if not exists region_scope text not null default 'national',
  add column if not exists region_key text not null default 'kr',
  add column if not exists search_phrase text;

update public.demand_keyword_daily
set
  region_scope = 'national',
  region_key = 'kr',
  search_phrase = case keyword_key
    when 'packing' then '포장이사'
    when 'move_in_clean' then '입주청소'
    else search_phrase
  end
where search_phrase is null;

alter table public.demand_keyword_daily
  drop constraint if exists demand_keyword_daily_keyword_key_period_date_key;

alter table public.demand_keyword_daily
  add constraint demand_keyword_daily_region_unique
  unique (keyword_key, region_scope, region_key, period_date);

create index if not exists idx_demand_keyword_daily_region
  on public.demand_keyword_daily (region_scope, region_key, keyword_key, period_date desc);

alter table public.demand_keyword_monthly
  add column if not exists region_scope text not null default 'national',
  add column if not exists region_key text not null default 'kr',
  add column if not exists search_phrase text;

update public.demand_keyword_monthly
set
  region_scope = 'national',
  region_key = 'kr',
  search_phrase = case keyword_key
    when 'packing' then '포장이사'
    when 'move_in_clean' then '입주청소'
    else search_phrase
  end
where search_phrase is null;

alter table public.demand_keyword_monthly
  drop constraint if exists demand_keyword_monthly_keyword_key_yyyymm_key;

alter table public.demand_keyword_monthly
  add constraint demand_keyword_monthly_region_unique
  unique (keyword_key, region_scope, region_key, yyyymm);

create index if not exists idx_demand_keyword_monthly_region
  on public.demand_keyword_monthly (region_scope, region_key, keyword_key, yyyymm desc);
