-- 장소별 작업 매뉴얼 (정기청소·걸레질 등 job). 오염찾기(solutions)와 분리.
create table if not exists cleaning_place_jobs (
  id text primary key,
  place_id text not null,
  slug text not null,
  title text not null,
  summary text,
  prepare text[] not null default '{}',
  steps text[] not null default '{}',
  motions text[] not null default '{}',
  checklist text[] not null default '{}',
  frequency text,
  cautions text[] not null default '{}',
  pollution_links jsonb,
  related_service_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order int not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (place_id, slug)
);

create index if not exists idx_cleaning_place_jobs_place on cleaning_place_jobs (place_id);
create index if not exists idx_cleaning_place_jobs_status on cleaning_place_jobs (status);

alter table cleaning_place_jobs enable row level security;

create policy "cleaning_place_jobs_public_read"
  on cleaning_place_jobs for select
  to anon, authenticated
  using (status = 'published');

create policy "cleaning_place_jobs_admin_all"
  on cleaning_place_jobs for all
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );

comment on table cleaning_place_jobs is
  'Place cleaning method jobs (how to mop/routine) — distinct from contaminant solution pages';
