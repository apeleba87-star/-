-- 프리셋 중심 운영 전환:
-- - job_post_positions.category_main_id nullable 허용
-- - completed_job_assignments.category_main_id nullable 허용
-- - 활성 프리셋 category_sub_id 강제 체크 제거

ALTER TABLE public.job_post_positions
  ALTER COLUMN category_main_id DROP NOT NULL;

ALTER TABLE public.completed_job_assignments
  ALTER COLUMN category_main_id DROP NOT NULL;

ALTER TABLE public.job_type_presets
  DROP CONSTRAINT IF EXISTS job_type_presets_active_requires_sub;

