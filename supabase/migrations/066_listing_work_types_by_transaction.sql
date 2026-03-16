-- 유형별 업무 종류 데이터 정리: 정기 매매·정기 소개·도급 / 일회 소개 구분. 일회 매매는 업무 종류 없음.
-- 1) 필요한 카테고리(업무 종류)가 없으면 추가
-- 2) 현장거래 업무 종류의 적용 유형(category_listing_types) 전부 삭제 후 재등록

-- 1. 카테고리 없으면 추가 (usage=listing, parent_id NULL)
INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, usage, updated_at)
SELECT gen_random_uuid(), v.name, NULL, 'listing_' || md5(v.name), 0, true, 'listing', now()
FROM (VALUES
  ('사무실 청소'), ('병원 청소'), ('카페 청소'), ('학원 청소'), ('계단 청소'), ('매장 청소'), ('건물 청소'), ('공장 청소'), ('헬스장 청소'),
  ('입주 청소'), ('준공 청소'), ('외벽 청소'), ('유리창 청소'), ('간판,어닝 청소'), ('사무실 대청소'), ('식당 대청소'), ('건물 대청소'), ('기타 대청소')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.usage = 'listing' AND c.parent_id IS NULL AND c.name = v.name
);

-- 2. 기존 현장거래(대분류) 카테고리의 적용 유형 링크 전부 삭제
DELETE FROM public.category_listing_types
WHERE category_id IN (SELECT id FROM public.categories WHERE usage = 'listing' AND parent_id IS NULL);

-- 3. 정기 매매·정기 소개·도급 공통 업무 종류 (일회 매매 제외)
INSERT INTO public.category_listing_types (category_id, listing_type)
SELECT c.id, lt
FROM (
  SELECT DISTINCT ON (name) id, name FROM public.categories
  WHERE usage = 'listing' AND parent_id IS NULL
    AND name IN (
      '사무실 청소', '병원 청소', '카페 청소', '학원 청소', '계단 청소', '매장 청소', '건물 청소', '공장 청소', '헬스장 청소'
    )
  ORDER BY name, id
) c
CROSS JOIN unnest(ARRAY['sale_regular', 'referral_regular', 'subcontract']::text[]) AS lt;

-- 4. 일회 소개 전용 업무 종류
INSERT INTO public.category_listing_types (category_id, listing_type)
SELECT sub.id, 'referral_one_time'
FROM (
  SELECT DISTINCT ON (c.name) c.id
  FROM public.categories c
  WHERE c.usage = 'listing' AND c.parent_id IS NULL
    AND c.name IN (
      '입주 청소', '준공 청소', '외벽 청소', '유리창 청소', '간판,어닝 청소',
      '사무실 대청소', '식당 대청소', '건물 대청소', '기타 대청소'
    )
  ORDER BY c.name, c.id
) sub;

