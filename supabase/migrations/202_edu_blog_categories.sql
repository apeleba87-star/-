-- 청소업 실무(/blog) 안쪽 칸 — 관리자가 과정(입주·마케팅 등)을 설정
create table if not exists public.edu_blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists edu_blog_categories_slug_unique
  on public.edu_blog_categories (slug);

create index if not exists edu_blog_categories_sort_idx
  on public.edu_blog_categories (sort_order, name);

comment on table public.edu_blog_categories is
  '청소업 실무 허브 칸(과정). 글 posts.edu_category_id 로 연결';

alter table public.posts
  add column if not exists edu_category_id uuid references public.edu_blog_categories (id) on delete set null;

create index if not exists posts_edu_category_id_idx
  on public.posts (edu_category_id)
  where source_type = 'edu_blog';

comment on column public.posts.edu_category_id is
  '청소업 실무 칸. 칸 삭제 시 null (글 URL 유지)';

alter table public.edu_blog_categories enable row level security;

drop policy if exists "edu_blog_categories_public_read" on public.edu_blog_categories;
create policy "edu_blog_categories_public_read"
  on public.edu_blog_categories for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "edu_blog_categories_admin_all" on public.edu_blog_categories;
create policy "edu_blog_categories_admin_all"
  on public.edu_blog_categories for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );
