-- 지식 허브 제품 마스터 오버레이 (문서 제품 수정·숨김 + 관리자 신규 제품)

create table if not exists cleaning_products (
  id text primary key,
  origin text not null default 'admin'
    check (origin in ('source_override', 'admin')),
  brand text not null,
  name text not null,
  aliases text[] not null default '{}',
  ph_type text not null default 'unknown',
  ph_approx text,
  summary text,
  main_use text[] not null default '{}',
  compatible_material_ids text[] not null default '{}',
  contaminant_ids text[] not null default '{}',
  forbidden_material_ids text[] not null default '{}',
  materials_raw text[] not null default '{}',
  contaminants_raw text[] not null default '{}',
  forbidden_raw text[] not null default '{}',
  standard_dilution text,
  strong_dilution text,
  dwell_time text,
  pack_sizes text[] not null default '{}',
  warnings text[] not null default '{}',
  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low')),
  status text not null default 'active'
    check (status in ('active', 'discontinued', 'verify', 'draft')),
  deleted_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cleaning_products_updated on cleaning_products (updated_at desc);
create index if not exists idx_cleaning_products_deleted on cleaning_products (deleted_at);

alter table cleaning_products enable row level security;

create policy "cleaning_products_public_read"
  on cleaning_products for select
  to anon, authenticated
  using (deleted_at is null);

create policy "cleaning_products_admin_write"
  on cleaning_products for all
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
