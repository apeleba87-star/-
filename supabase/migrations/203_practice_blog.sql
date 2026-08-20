-- 청소업 실무: 관리자가 칸(메뉴)과 글을 추가·수정·삭제
-- posts.source_type = practice_blog, 칸 = practice_categories

CREATE TABLE IF NOT EXISTS public.practice_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT practice_categories_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE public.practice_categories IS '청소업 실무 안쪽 칸(입주·에어컨·마케팅 등). 관리자가 CRUD.';
COMMENT ON COLUMN public.practice_categories.slug IS '공개 URL /practice/c/{slug}';
COMMENT ON COLUMN public.practice_categories.is_published IS 'true면 /practice 허브 카드에 노출';

CREATE INDEX IF NOT EXISTS practice_categories_sort_idx
  ON public.practice_categories (sort_order, name);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS practice_category_id UUID REFERENCES public.practice_categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.posts.practice_category_id IS '청소업 실무 글이 속한 칸. 칸 삭제 시 NULL.';

CREATE INDEX IF NOT EXISTS posts_practice_category_idx
  ON public.posts (practice_category_id)
  WHERE source_type = 'practice_blog';

CREATE UNIQUE INDEX IF NOT EXISTS posts_practice_blog_slug_unique
  ON public.posts (slug)
  WHERE source_type = 'practice_blog' AND slug IS NOT NULL;

ALTER TABLE public.practice_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_categories_public_read" ON public.practice_categories;
CREATE POLICY "practice_categories_public_read" ON public.practice_categories
FOR SELECT USING (
  is_published = true
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
);

DROP POLICY IF EXISTS "practice_categories_staff_write" ON public.practice_categories;
CREATE POLICY "practice_categories_staff_write" ON public.practice_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
);

ALTER TABLE public.knowledge_media
  DROP CONSTRAINT IF EXISTS knowledge_media_entity_type_check;

ALTER TABLE public.knowledge_media
  ADD CONSTRAINT knowledge_media_entity_type_check
  CHECK (entity_type IN ('product', 'equipment', 'edu_blog', 'guide', 'practice_blog'));
