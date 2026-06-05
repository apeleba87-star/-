-- demand_* 공개 통계: anon/authenticated SELECT만 허용, 쓰기는 service_role(cron/admin) 전용

alter table public.demand_rtms_monthly enable row level security;
alter table public.demand_keyword_daily enable row level security;
alter table public.demand_keyword_monthly enable row level security;
alter table public.demand_gu_scores enable row level security;

drop policy if exists demand_rtms_monthly_public_read on public.demand_rtms_monthly;
create policy demand_rtms_monthly_public_read on public.demand_rtms_monthly
  for select using (true);

drop policy if exists demand_keyword_daily_public_read on public.demand_keyword_daily;
create policy demand_keyword_daily_public_read on public.demand_keyword_daily
  for select using (true);

drop policy if exists demand_keyword_monthly_public_read on public.demand_keyword_monthly;
create policy demand_keyword_monthly_public_read on public.demand_keyword_monthly
  for select using (true);

drop policy if exists demand_gu_scores_public_read on public.demand_gu_scores;
create policy demand_gu_scores_public_read on public.demand_gu_scores
  for select using (true);
