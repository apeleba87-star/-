-- phrase별 일별 행 — 롤링 30일 Basket(여러 phrase/region/일) 공존
-- 기존 unique(keyword, region, period_date, source)는 Basket phrase upsert 시 충돌

update public.demand_keyword_daily
set search_phrase = case keyword_key
  when 'packing' then coalesce(nullif(trim(search_phrase), ''), '포장이사')
  when 'move_in_clean' then coalesce(nullif(trim(search_phrase), ''), '입주청소')
  else coalesce(nullif(trim(search_phrase), ''), keyword_key)
end
where search_phrase is null or trim(search_phrase) = '';

-- 동일 (keyword, region, date, source)에 phrase 없이 중복된 행 — 최신 id만 유지
delete from public.demand_keyword_daily d
using public.demand_keyword_daily d2
where d.id < d2.id
  and d.keyword_key = d2.keyword_key
  and d.region_scope = d2.region_scope
  and d.region_key = d2.region_key
  and d.period_date = d2.period_date
  and d.source = d2.source
  and coalesce(d.search_phrase, '') = coalesce(d2.search_phrase, '');

alter table public.demand_keyword_daily
  drop constraint if exists demand_keyword_daily_region_source_unique;

alter table public.demand_keyword_daily
  drop constraint if exists demand_keyword_daily_region_unique;

alter table public.demand_keyword_daily
  drop constraint if exists demand_keyword_daily_keyword_key_period_date_key;

alter table public.demand_keyword_daily
  alter column search_phrase set not null;

alter table public.demand_keyword_daily
  add constraint demand_keyword_daily_phrase_source_unique
  unique (keyword_key, region_scope, region_key, search_phrase, period_date, source);

create index if not exists idx_demand_keyword_daily_phrase
  on public.demand_keyword_daily (region_scope, region_key, search_phrase, period_date desc);
