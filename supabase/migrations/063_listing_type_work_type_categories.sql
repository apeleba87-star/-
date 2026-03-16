-- 현장거래: 유형 = 거래 유형(정기 매매 등), 업무 종류 = 병원 청소·사무실 청소 등
-- 업무 종류를 대분류(parent_id NULL)로 확실히 두고, 목록에 없으면 생성

INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, updated_at, usage)
VALUES
  (gen_random_uuid(), '병원 청소', NULL, 'listing_work_hospital', 1, true, NOW(), 'listing'),
  (gen_random_uuid(), '사무실 청소', NULL, 'listing_work_office', 2, true, NOW(), 'listing'),
  (gen_random_uuid(), '카페 청소', NULL, 'listing_work_cafe', 3, true, NOW(), 'listing'),
  (gen_random_uuid(), '계단 청소', NULL, 'listing_work_stairs', 4, true, NOW(), 'listing'),
  (gen_random_uuid(), '학원 청소', NULL, 'listing_work_academy', 5, true, NOW(), 'listing'),
  (gen_random_uuid(), '식당 청소', NULL, 'listing_work_restaurant', 6, true, NOW(), 'listing'),
  (gen_random_uuid(), '매장 청소', NULL, 'listing_work_store', 7, true, NOW(), 'listing')
ON CONFLICT (slug) DO UPDATE SET usage = 'listing', name = EXCLUDED.name;

-- 기존 listing이 참조하는 카테고리 중 이름이 위 7개와 같은 소분류가 있으면
-- 해당 업무 종류(대분류) id로 listing을 보정 (category_main_id = 업무종류 id, category_sub_id = null)
UPDATE public.listings l
SET
  category_main_id = c_main.id,
  category_sub_id = NULL
FROM public.categories c_sub
JOIN public.categories c_main ON c_main.parent_id IS NULL
  AND c_main.usage = 'listing'
  AND c_main.name = c_sub.name
  AND c_main.slug IN (
    'listing_work_hospital', 'listing_work_office', 'listing_work_cafe',
    'listing_work_stairs', 'listing_work_academy', 'listing_work_restaurant', 'listing_work_store'
  )
WHERE l.category_sub_id = c_sub.id
  AND c_sub.parent_id IS NOT NULL;
