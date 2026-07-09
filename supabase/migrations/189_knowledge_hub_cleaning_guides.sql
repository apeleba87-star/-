-- Knowledge hub: cleaning guides, products, inquiries (Phase 1-4)

create table if not exists public.cleaning_guides (
  id uuid primary key default gen_random_uuid(),
  guide_type text not null check (guide_type in ('service_method', 'service_supplies', 'problem')),
  service_slug text not null,
  slug text not null unique,
  path text not null unique,
  h1 text not null,
  seo_title text not null,
  seo_description text not null default '',
  body_json jsonb not null default '{}'::jsonb,
  indexable boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists cleaning_guides_path_idx on public.cleaning_guides (path);
create index if not exists cleaning_guides_service_slug_idx on public.cleaning_guides (service_slug);
create index if not exists cleaning_guides_published_idx on public.cleaning_guides (published_at desc)
  where published_at is not null;

create table if not exists public.knowledge_products (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.cleaning_guides(id) on delete cascade,
  block_id text not null default 'products',
  display_name text not null,
  source_type text not null check (source_type in ('coupang', 'smartstore')),
  source_url text not null default '',
  coupang_keyword text,
  image_url text,
  price_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_products_guide_id_idx on public.knowledge_products (guide_id, sort_order);

create table if not exists public.cleaning_inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_type text not null check (inquiry_type in ('regular', 'move_in')),
  service_slug text,
  region text,
  phone text not null,
  message text,
  ref_slug text,
  ref_path text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists cleaning_inquiries_created_idx on public.cleaning_inquiries (created_at desc);

alter table public.cleaning_guides enable row level security;
alter table public.knowledge_products enable row level security;
alter table public.cleaning_inquiries enable row level security;

-- Public read published guides
create policy "public_read_published_guides" on public.cleaning_guides
  for select using (published_at is not null);

create policy "public_read_guide_products" on public.knowledge_products
  for select using (
    exists (
      select 1 from public.cleaning_guides g
      where g.id = guide_id and g.published_at is not null
    )
  );

-- Anyone can submit inquiry
create policy "public_insert_inquiries" on public.cleaning_inquiries
  for insert with check (true);

-- Admin/editor full access
create policy "admin_cleaning_guides" on public.cleaning_guides
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor'))
  );

create policy "admin_knowledge_products" on public.knowledge_products
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor'))
  );

create policy "admin_cleaning_inquiries" on public.cleaning_inquiries
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor'))
  );

create policy "admin_update_inquiries" on public.cleaning_inquiries
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor'))
  );
