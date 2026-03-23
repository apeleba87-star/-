-- 구인 프리셋(lib/jobs/job-type-presets) slug 중 초기 시드에 없던 소분류 보강
-- (식당 청소 → restaurant, 신호수 → signal). 상가청소는 기존 office(사무실청소) 행과 동일 slug 공유.

INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, updated_at, usage)
SELECT
  gen_random_uuid(),
  '식당 청소',
  c.id,
  'restaurant',
  20,
  true,
  NOW(),
  COALESCE(c.usage, 'default')
FROM public.categories c
WHERE c.parent_id IS NULL AND c.slug = 'general' AND c.is_active = true
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, updated_at, usage)
SELECT
  gen_random_uuid(),
  '신호수',
  c.id,
  'signal',
  21,
  true,
  NOW(),
  COALESCE(c.usage, 'default')
FROM public.categories c
WHERE c.parent_id IS NULL AND c.slug = 'general' AND c.is_active = true
LIMIT 1
ON CONFLICT (slug) DO NOTHING;
