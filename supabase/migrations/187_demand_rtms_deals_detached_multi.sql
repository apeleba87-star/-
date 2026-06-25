-- Move budget finder: support detached/multi-family rent data.

alter table public.demand_rtms_deals
  drop constraint if exists demand_rtms_deals_housing_type_check;

alter table public.demand_rtms_deals
  add constraint demand_rtms_deals_housing_type_check
  check (housing_type in ('apartment', 'villa', 'officetel', 'detached_multi'));
