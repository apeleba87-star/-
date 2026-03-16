-- 현장 거래에 등록된 유형·업무 종류를 관리자 카테고리(유형/업무종류)에 그대로 반영
-- 1) 텍스트만 있고 ID가 비어 있는 listing → 해당 이름으로 유형/업무종류 찾거나 생성 후 ID 보정
-- 2) listing에서 참조하는 모든 유형/업무종류가 usage='listing'으로 노출되도록 (061에서 이미 처리)

-- 유형(대분류): category_main_id가 NULL이고 category_main 텍스트가 있는 경우
-- 해당 텍스트로 main 카테고리 찾거나 생성 후 listing.category_main_id 보정
DO $$
DECLARE
  r RECORD;
  main_id UUID;
  new_slug TEXT;
  sort_val INT;
BEGIN
  FOR r IN
    SELECT DISTINCT TRIM(l.category_main) AS name
    FROM public.listings l
    WHERE l.category_main_id IS NULL
      AND l.category_main IS NOT NULL
      AND TRIM(l.category_main) <> ''
  LOOP
    -- 기존 대분류 매칭 (slug 또는 name)
    SELECT id INTO main_id
    FROM public.categories
    WHERE parent_id IS NULL
      AND (slug = r.name OR name = r.name)
    LIMIT 1;

    IF main_id IS NULL THEN
      new_slug := 'lst_m_' || substr(md5(r.name), 1, 12);
      SELECT COALESCE(MAX(sort_order), 0) + 1 INTO sort_val FROM public.categories WHERE parent_id IS NULL;
      INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, updated_at, usage)
      VALUES (gen_random_uuid(), r.name, NULL, new_slug, sort_val, true, NOW(), 'listing')
      ON CONFLICT (slug) DO UPDATE SET usage = 'listing', name = EXCLUDED.name
      RETURNING id INTO main_id;
      IF main_id IS NULL THEN
        SELECT id INTO main_id FROM public.categories WHERE slug = new_slug LIMIT 1;
      END IF;
    ELSE
      UPDATE public.categories SET usage = 'listing' WHERE id = main_id;
    END IF;

    UPDATE public.listings
    SET category_main_id = main_id
    WHERE category_main_id IS NULL AND TRIM(category_main) = r.name;
  END LOOP;
END $$;

-- 업무 종류(소분류): category_sub_id가 NULL이고 category_sub 또는 custom_subcategory_text가 있는 경우
-- 해당 main 아래에 sub 찾거나 생성 후 listing.category_sub_id 보정
DO $$
DECLARE
  r RECORD;
  sub_id UUID;
  new_slug TEXT;
  sort_val INT;
BEGIN
  FOR r IN
    SELECT DISTINCT
      l.category_main_id AS main_id,
      COALESCE(NULLIF(TRIM(l.custom_subcategory_text), ''), TRIM(l.category_sub)) AS sub_name
    FROM public.listings l
    WHERE l.category_main_id IS NOT NULL
      AND l.category_sub_id IS NULL
      AND (
        (l.category_sub IS NOT NULL AND TRIM(l.category_sub) <> '')
        OR (l.custom_subcategory_text IS NOT NULL AND TRIM(l.custom_subcategory_text) <> '')
      )
  LOOP
    IF r.sub_name IS NULL OR r.sub_name = '' THEN
      CONTINUE;
    END IF;

    SELECT id INTO sub_id
    FROM public.categories
    WHERE parent_id = r.main_id
      AND (slug = r.sub_name OR name = r.sub_name)
    LIMIT 1;

    IF sub_id IS NULL THEN
      new_slug := 'lst_s_' || substr(md5(r.sub_name || r.main_id::text), 1, 12);
      SELECT COALESCE(MAX(sort_order), 0) + 1 INTO sort_val FROM public.categories WHERE parent_id = r.main_id;
      INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, updated_at, usage)
      VALUES (gen_random_uuid(), r.sub_name, r.main_id, new_slug, sort_val, true, NOW(), 'listing')
      ON CONFLICT (slug) DO UPDATE SET usage = 'listing', name = EXCLUDED.name
      RETURNING id INTO sub_id;
      IF sub_id IS NULL THEN
        SELECT id INTO sub_id FROM public.categories WHERE slug = new_slug LIMIT 1;
      END IF;
    ELSE
      UPDATE public.categories SET usage = 'listing' WHERE id = sub_id;
    END IF;

    UPDATE public.listings
    SET category_sub_id = sub_id
    WHERE category_main_id = r.main_id
      AND category_sub_id IS NULL
      AND (
        TRIM(COALESCE(custom_subcategory_text, '')) = r.sub_name
        OR TRIM(COALESCE(category_sub, '')) = r.sub_name
      );
  END LOOP;
END $$;

-- 한 번 더: listing에서 참조하는 모든 카테고리 usage='listing' 확실히
UPDATE public.categories c
SET usage = 'listing'
WHERE (
  EXISTS (SELECT 1 FROM public.listings l WHERE l.category_main_id = c.id)
  OR EXISTS (SELECT 1 FROM public.listings l WHERE l.category_sub_id = c.id)
)
AND c.usage <> 'listing';
