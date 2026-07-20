-- 재질별 표면 안전 가이드 (시드 오버레이). 재질 마스터 ID는 코드 시드와 동일.
create table if not exists cleaning_material_guides (
  material_id text primary key,
  principle text not null default '',
  donts text[] not null default '{}',
  ok_hints text[] not null default '{}',
  care text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_cleaning_material_guides_status on cleaning_material_guides (status);

alter table cleaning_material_guides enable row level security;

create policy "cleaning_material_guides_public_read"
  on cleaning_material_guides for select
  to anon, authenticated
  using (status = 'published');

create policy "cleaning_material_guides_admin_all"
  on cleaning_material_guides for all
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

comment on table cleaning_material_guides is
  'Material surface-safety guide overlays (principle/donts/ok/care) — distinct from contaminant solutions';
