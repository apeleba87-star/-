-- Re-key legacy Seoul district RTMS rows (bare slug → seoul:slug)
update public.demand_rtms_monthly
set region_key = 'seoul:' || region_key
where region_scope = 'district'
  and region_key not like '%:%';
