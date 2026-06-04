-- phrase별 월별 검색량 스냅샷 (Basket MVP)

alter table public.demand_keyword_monthly
  drop constraint if exists demand_keyword_monthly_region_unique;

update public.demand_keyword_monthly
set search_phrase = case keyword_key
  when 'packing' then coalesce(nullif(trim(search_phrase), ''), '포장이사')
  when 'move_in_clean' then coalesce(nullif(trim(search_phrase), ''), '입주청소')
  else coalesce(nullif(trim(search_phrase), ''), keyword_key)
end
where search_phrase is null or trim(search_phrase) = '';

alter table public.demand_keyword_monthly
  alter column search_phrase set not null;

alter table public.demand_keyword_monthly
  add constraint demand_keyword_monthly_phrase_unique
  unique (keyword_key, region_scope, region_key, search_phrase, yyyymm);

create index if not exists idx_demand_keyword_monthly_phrase
  on public.demand_keyword_monthly (region_scope, region_key, search_phrase, yyyymm desc);
