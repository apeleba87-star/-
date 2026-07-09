-- 청소 지식 팩트 DB (향후 admin 승인·발행용). v1은 TS 시드(initial-knowledge.ts)가 소스.

create table if not exists cleaning_knowledge_batches (
  id uuid primary key default gen_random_uuid(),
  source_title text not null,
  raw_excerpt text,
  status text not null default 'pending' check (status in ('pending', 'merged', 'rejected')),
  ingest_result jsonb,
  created_at timestamptz not null default now(),
  merged_at timestamptz
);

create table if not exists cleaning_knowledge_facts (
  id text primary key,
  fact_type text not null,
  product_id text,
  material_ids text[] default '{}',
  contaminant_id text,
  body text not null,
  dilution text,
  dwell_time text,
  tools text[] default '{}',
  steps text[] default '{}',
  warnings text[] default '{}',
  confidence text not null default 'medium',
  guide_paths text[] default '{}',
  sources jsonb default '[]',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cleaning_knowledge_facts_published on cleaning_knowledge_facts (published);
create index if not exists idx_cleaning_knowledge_facts_product on cleaning_knowledge_facts (product_id);

create table if not exists cleaning_knowledge_recipes (
  slug text primary key,
  seo_title text not null,
  field text,
  material_id text not null,
  contaminant_id text not null,
  product_id text not null,
  dilution text,
  dwell_time text,
  tools text[] default '{}',
  steps text[] default '{}',
  warnings text[] default '{}',
  summary text not null,
  confidence text not null default 'medium',
  guide_paths text[] default '{}',
  sources jsonb default '[]',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cleaning_knowledge_recipes_published on cleaning_knowledge_recipes (published);
