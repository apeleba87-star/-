-- 청소장비 마스터 오버레이 (시드 JSON 수정·숨김 + 관리자 신규)
-- 적용 후 관리자 /admin/equipment 에서 추가·편집 가능

create table if not exists cleaning_equipment (
  id text primary key,
  origin text not null default 'admin'
    check (origin in ('source_override', 'admin')),
  category_id text not null
    check (category_id in ('heavy', 'hand', 'consumable', 'accessory')),
  name text not null,
  aliases text[] not null default '{}',
  summary text not null default '',
  what_is text not null default '',
  place_hints text[] not null default '{}',
  job_hints text[] not null default '{}',
  selection_criteria text[] not null default '{}',
  use_steps text[] not null default '{}',
  beginner_mistakes text[] not null default '{}',
  warnings text[] not null default '{}',
  related_product_ids text[] not null default '{}',
  related_equipment_ids text[] not null default '{}',
  contaminant_ids text[] not null default '{}',
  material_ids text[] not null default '{}',
  place_job_hints text[] not null default '{}',
  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low')),
  status text not null default 'draft'
    check (status in ('active', 'draft', 'planned')),
  deleted_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cleaning_equipment_updated on cleaning_equipment (updated_at desc);
create index if not exists idx_cleaning_equipment_deleted on cleaning_equipment (deleted_at);
create index if not exists idx_cleaning_equipment_category on cleaning_equipment (category_id);

alter table cleaning_equipment enable row level security;

create policy "cleaning_equipment_public_read"
  on cleaning_equipment for select
  to anon, authenticated
  using (deleted_at is null);

create policy "cleaning_equipment_admin_write"
  on cleaning_equipment for all
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

-- 브랜드·기종 오버레이
create table if not exists cleaning_equipment_models (
  id text primary key,
  origin text not null default 'admin'
    check (origin in ('source_override', 'admin')),
  equipment_id text not null,
  brand text not null,
  name text not null,
  aliases text[] not null default '{}',
  summary text not null default '',
  best_for text[] not null default '{}',
  selection_notes text[] not null default '{}',
  cautions text[] not null default '{}',
  related_equipment_ids text[] not null default '{}',
  sales_url text,
  sales_label text,
  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low')),
  status text not null default 'draft'
    check (status in ('active', 'draft', 'planned')),
  deleted_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cleaning_equipment_models_equipment
  on cleaning_equipment_models (equipment_id);
create index if not exists idx_cleaning_equipment_models_updated
  on cleaning_equipment_models (updated_at desc);
create index if not exists idx_cleaning_equipment_models_deleted
  on cleaning_equipment_models (deleted_at);

alter table cleaning_equipment_models enable row level security;

create policy "cleaning_equipment_models_public_read"
  on cleaning_equipment_models for select
  to anon, authenticated
  using (deleted_at is null);

create policy "cleaning_equipment_models_admin_write"
  on cleaning_equipment_models for all
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
