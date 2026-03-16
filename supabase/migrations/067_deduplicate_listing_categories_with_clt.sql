-- 업무 종류 이름 중복 제거: 동일 이름(usage=listing, parent_id NULL)은 하나만 남기고,
-- category_listing_types 먼저 대표 id로 합친 뒤 참조 정리 및 중복 행 삭제

DO $$
DECLARE
  r RECORD;
  keep_id UUID;
  dup_id UUID;
BEGIN
  FOR r IN
    SELECT name
    FROM public.categories
    WHERE usage = 'listing' AND parent_id IS NULL
    GROUP BY name
    HAVING COUNT(*) > 1
  LOOP
    -- 남길 행: category_listing_types 있는 것 우선, 그 다음 slug listing_% 우선
    SELECT id INTO keep_id
    FROM public.categories c
    WHERE c.usage = 'listing' AND c.parent_id IS NULL AND c.name = r.name
    ORDER BY
      (SELECT COUNT(*) FROM public.category_listing_types clt WHERE clt.category_id = c.id) DESC,
      (c.slug LIKE 'listing_%') DESC NULLS LAST,
      c.id
    LIMIT 1;

    FOR dup_id IN
      SELECT id FROM public.categories
      WHERE usage = 'listing' AND parent_id IS NULL AND name = r.name AND id <> keep_id
    LOOP
      -- 적용 유형( listing_type )을 대표 id로 합침
      INSERT INTO public.category_listing_types (category_id, listing_type)
      SELECT keep_id, listing_type
      FROM public.category_listing_types
      WHERE category_id = dup_id
      ON CONFLICT (category_id, listing_type) DO NOTHING;

      UPDATE public.listings SET category_main_id = keep_id WHERE category_main_id = dup_id;
      UPDATE public.listings SET category_sub_id = keep_id WHERE category_sub_id = dup_id;
      UPDATE public.categories SET parent_id = keep_id WHERE parent_id = dup_id;

      DELETE FROM public.category_listing_types WHERE category_id = dup_id;
      DELETE FROM public.categories WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;
