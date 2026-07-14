-- 검색어형 솔루션: 오염 마스터 제품 연결 + 장소 페이지 override/추가

create table if not exists cleaning_contaminant_masters (
  contaminant_id text primary key,
  product_ids text[] not null default '{}',
  base_guide text,
  warnings text[] not null default '{}',
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table cleaning_contaminant_masters enable row level security;

create policy "cleaning_contaminant_masters_public_read"
  on cleaning_contaminant_masters for select
  to anon, authenticated
  using (true);

create policy "cleaning_contaminant_masters_admin_write"
  on cleaning_contaminant_masters for all
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

create table if not exists cleaning_solution_pages (
  id text primary key,
  place_id text not null,
  space_id text not null,
  part_id text not null,
  contaminant_id text not null,
  slug text not null,
  material_id text,
  title text not null,
  description text,
  place_context text,
  product_ids text[],
  material_contaminant_id text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (place_id, space_id, part_id, slug)
);

create index if not exists idx_cleaning_solution_pages_status on cleaning_solution_pages (status);
create index if not exists idx_cleaning_solution_pages_place on cleaning_solution_pages (place_id);

alter table cleaning_solution_pages enable row level security;

create policy "cleaning_solution_pages_public_read"
  on cleaning_solution_pages for select
  to anon, authenticated
  using (status = 'published');

create policy "cleaning_solution_pages_admin_all"
  on cleaning_solution_pages for all
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
