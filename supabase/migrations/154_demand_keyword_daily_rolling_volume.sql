-- 검색광고 롤링 30일 — demand_keyword_daily (source=searchad_rolling_30d)
-- 데이터랩 일별 지수(source=datalab)와 같은 날 공존, source로 구분

alter table public.demand_keyword_daily
  add column if not exists search_volume_rolling_30d integer,
  add column if not exists search_volume_below_ten boolean not null default false;

comment on column public.demand_keyword_daily.search_volume_rolling_30d is
  '검색광고 API 최근 30일 롤링 합(phrase 단위). source=searchad_rolling_30d 일 때만 사용';
