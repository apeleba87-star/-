-- 작업 종류 단순 입력 + 내부 정규화: job_type_input, normalized_job_type_key, normalization_status
-- 숙련도(skill_level)는 기존 컬럼 유지. completed_job_assignments에 skill_level·normalized_job_type_key 추가.

-- 1. job_post_positions 확장
ALTER TABLE public.job_post_positions
  ADD COLUMN IF NOT EXISTS job_type_input TEXT,
  ADD COLUMN IF NOT EXISTS normalized_job_type_key TEXT,
  ADD COLUMN IF NOT EXISTS normalization_status TEXT CHECK (normalization_status IS NULL OR normalization_status IN ('auto_mapped', 'manual_review', 'manual_mapped'));

COMMENT ON COLUMN public.job_post_positions.job_type_input IS '사용자가 선택/입력한 작업 종류 원문';
COMMENT ON COLUMN public.job_post_positions.normalized_job_type_key IS '내부 표준 키, 단가 집계용';
COMMENT ON COLUMN public.job_post_positions.normalization_status IS 'auto_mapped | manual_review | manual_mapped';

-- skill_level 제약: expert(숙련자/기공), general(일반/보조)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_post_positions' AND column_name = 'skill_level'
  ) THEN
    ALTER TABLE public.job_post_positions ADD COLUMN skill_level TEXT;
  END IF;
END $$;
-- 기존 skill_level에 CHECK 없으면 추가하지 않음 (기존 데이터 호환). 앱에서 expert/general만 사용.

-- 2. completed_job_assignments에 skill_level, normalized_job_type_key 추가
ALTER TABLE public.completed_job_assignments
  ADD COLUMN IF NOT EXISTS skill_level TEXT,
  ADD COLUMN IF NOT EXISTS normalized_job_type_key TEXT;

COMMENT ON COLUMN public.completed_job_assignments.skill_level IS '포지션의 숙련도: expert | general';
COMMENT ON COLUMN public.completed_job_assignments.normalized_job_type_key IS '단가 집계용 표준 작업 키';

CREATE INDEX IF NOT EXISTS idx_job_post_positions_normalized_key ON job_post_positions(normalized_job_type_key) WHERE normalized_job_type_key IS NOT NULL;
