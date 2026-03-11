-- 출생년도 → 생일(날짜)로 대체, 성별은 남(M)/여(F)만 허용

-- 1. 생일 컬럼 추가 (YYYY-MM-DD 저장)
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.worker_profiles.birth_date IS '생일 (YYYY-MM-DD). 나이대 표시에 사용';

-- 2. 기존 birth_year → birth_date 이전 (1월 1일로 설정)
UPDATE public.worker_profiles
SET birth_date = make_date(birth_year, 1, 1)
WHERE birth_year IS NOT NULL AND birth_year >= 1900 AND birth_year <= 2100 AND birth_date IS NULL;

-- 3. birth_year 컬럼 제거
ALTER TABLE public.worker_profiles DROP COLUMN IF EXISTS birth_year;

-- 4. 성별 제약: 남(M)/여(F)만 허용 (기타 제거)
-- 기존 'other' 등은 NULL로 처리 후 제약 변경
UPDATE public.worker_profiles SET gender = NULL WHERE gender IS NOT NULL AND gender NOT IN ('M', 'F');

ALTER TABLE public.worker_profiles
  DROP CONSTRAINT IF EXISTS worker_profiles_gender_check;

ALTER TABLE public.worker_profiles
  ADD CONSTRAINT worker_profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('M', 'F'));
