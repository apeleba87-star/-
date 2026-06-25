-- Move budget finder: queue-based RTMS deal ingest jobs for Vercel-friendly monthly refreshes.

create table if not exists public.demand_rtms_deal_ingest_jobs (
  id bigserial primary key,
  batch_key text not null,
  city_id text not null,
  city_label text not null,
  district_slug text not null,
  district_label text not null,
  region_key text not null,
  lawd_cd text not null,
  target_yyyymm text not null check (target_yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  source_group text not null check (
    source_group in (
      'apartment_trade',
      'apartment_rent',
      'villa_trade',
      'villa_rent',
      'officetel_trade',
      'officetel_rent',
      'detached_multi_trade',
      'detached_multi_rent'
    )
  ),
  status text not null default 'pending' check (status in ('pending', 'running', 'success', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  rows_upserted integer not null default 0 check (rows_upserted >= 0),
  calls integer not null default 0 check (calls >= 0),
  last_error text,
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_demand_rtms_deal_ingest_jobs_unique
  on public.demand_rtms_deal_ingest_jobs (batch_key, region_key, target_yyyymm, source_group);

create index if not exists idx_demand_rtms_deal_ingest_jobs_claim
  on public.demand_rtms_deal_ingest_jobs (status, locked_at, created_at);

create index if not exists idx_demand_rtms_deal_ingest_jobs_batch_status
  on public.demand_rtms_deal_ingest_jobs (batch_key, status);

create index if not exists idx_demand_rtms_deal_ingest_jobs_city_status
  on public.demand_rtms_deal_ingest_jobs (city_id, status);

alter table public.demand_rtms_deal_ingest_jobs enable row level security;

create or replace function public.claim_demand_rtms_deal_ingest_jobs(
  p_limit integer default 5,
  p_stale_minutes integer default 15,
  p_max_attempts integer default 5
)
returns setof public.demand_rtms_deal_ingest_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimable as (
    select id
    from public.demand_rtms_deal_ingest_jobs
    where
      attempts < p_max_attempts
      and (
        status = 'pending'
        or (
          status = 'running'
          and locked_at is not null
          and locked_at < now() - make_interval(mins => p_stale_minutes)
        )
        or status = 'failed'
      )
    order by
      case status
        when 'pending' then 0
        when 'running' then 1
        else 2
      end,
      created_at,
      id
    limit greatest(1, p_limit)
    for update skip locked
  )
  update public.demand_rtms_deal_ingest_jobs jobs
  set
    status = 'running',
    attempts = jobs.attempts + 1,
    locked_at = now(),
    started_at = coalesce(jobs.started_at, now()),
    finished_at = null,
    updated_at = now()
  from claimable
  where jobs.id = claimable.id
  returning jobs.*;
end;
$$;
