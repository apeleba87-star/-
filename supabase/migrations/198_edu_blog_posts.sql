-- 교육 블로그 (직접 작성): posts.source_type = edu_blog
-- 다음 글·제품 연결 컬럼 + slug 유니크

alter table public.posts
  add column if not exists edu_intent text,
  add column if not exists next_slug text,
  add column if not exists related_slugs text[] not null default '{}',
  add column if not exists product_ids text[] not null default '{}';

comment on column public.posts.edu_intent is '교육 블로그 의도: cause | how-to | compare | prevent 등';
comment on column public.posts.next_slug is '교육 블로그 다음 글 slug';
comment on column public.posts.related_slugs is '교육 블로그 관련 글 slug 목록';
comment on column public.posts.product_ids is '교육 블로그 연결 제품 카탈로그 ID';

create unique index if not exists posts_edu_blog_slug_unique
  on public.posts (slug)
  where source_type = 'edu_blog' and slug is not null;
