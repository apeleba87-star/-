-- 업무 종류 중복 제거: 동일 이름(usage=listing, parent_id NULL)은 하나만 남기고 참조 정리
-- 056의 site_* 와 063의 listing_work_* 로 같은 이름이 두 번 들어간 경우 정리

DO $$
DECLARE
  r RECORD;
  keep_id UUID;
  dup_id UUID;
BEGIN
  -- 이름별로 하나만 남길 대표 id 선택 (listing_work_* slug 우선, 없으면 아무거나)
  FOR r IN
    SELECT name
    FROM public.categories
    WHERE usage = 'listing' AND parent_id IS NULL
    GROUP BY name
    HAVING COUNT(*) > 1
  LOOP
    -- 남길 행: slug가 listing_work_% 인 것 우선
    SELECT id INTO keep_id
    FROM public.categories
    WHERE usage = 'listing' AND parent_id IS NULL AND name = r.name
    ORDER BY (slug LIKE 'listing_work_%') DESC NULLS LAST, id
    LIMIT 1;

    -- 나머지 중복 행들 참조 바꾼 뒤 삭제
    FOR dup_id IN
      SELECT id FROM public.categories
      WHERE usage = 'listing' AND parent_id IS NULL AND name = r.name AND id <> keep_id
    LOOP
      UPDATE public.listings SET category_main_id = keep_id WHERE category_main_id = dup_id;
      UPDATE public.listings SET category_sub_id = keep_id WHERE category_sub_id = dup_id;
      UPDATE public.categories SET parent_id = keep_id WHERE parent_id = dup_id;
      DELETE FROM public.categories WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;
