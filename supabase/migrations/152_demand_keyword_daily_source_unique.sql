-- 일별(datalab) vs 월별(datalab_month) 동일 period_date 공존

alter table public.demand_keyword_daily
  drop constraint if exists demand_keyword_daily_region_unique;

alter table public.demand_keyword_daily
  drop constraint if exists demand_keyword_daily_keyword_key_period_date_key;

alter table public.demand_keyword_daily
  add constraint demand_keyword_daily_region_source_unique
  unique (keyword_key, region_scope, region_key, period_date, source);
