-- 구인 폼 작업칩의 기준 테이블 (프리셋 키 중심)
CREATE TABLE IF NOT EXISTS public.job_type_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  category_main_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  category_sub_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_type_presets_active_sort
  ON public.job_type_presets (is_active, sort_order, label);

-- 기본 프리셋 시드 (기존 평균 단가 key 체계 유지)
WITH preset_seed(key, label, sort_order, sub_slug) AS (
  VALUES
    ('window_cleaning', '유리청소', 0, 'window'),
    ('completion_cleaning', '준공청소', 1, 'completion'),
    ('move_in_cleaning', '입주청소', 2, 'move_in'),
    ('school_cleaning', '학교청소', 3, 'kindergarten'),
    ('floor_wax', '왁스작업', 4, 'floor'),
    ('toilet_cleaning', '화장실청소', 5, 'disinfection'),
    ('store_cleaning', '상가청소', 6, 'office'),
    ('restaurant_cleaning', '식당 청소', 7, 'restaurant'),
    ('exterior_cleaning', '외벽청소', 8, 'exterior'),
    ('high_altitude', '고소작업', 9, 'high_altitude'),
    ('signal_person', '신호수', 10, 'signal'),
    ('disinfection', '소독', 11, 'disinfection')
)
INSERT INTO public.job_type_presets (key, label, sort_order, is_active, category_main_id, category_sub_id)
SELECT
  s.key,
  s.label,
  s.sort_order,
  true,
  c.parent_id,
  c.id
FROM preset_seed s
LEFT JOIN public.categories c
  ON c.slug = s.sub_slug
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  category_main_id = COALESCE(EXCLUDED.category_main_id, public.job_type_presets.category_main_id),
  category_sub_id = COALESCE(EXCLUDED.category_sub_id, public.job_type_presets.category_sub_id),
  updated_at = now();

