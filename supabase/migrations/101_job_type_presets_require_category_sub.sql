-- 활성 job_type_presets는 반드시 category_sub_id가 있어야 함
-- (집계/리포트/엑셀 템플릿에서 UUID 기반으로만 처리)

-- 1) 기존 데이터 정리: 매핑 없는 프리셋은 비활성화
UPDATE public.job_type_presets
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND category_sub_id IS NULL;

-- 2) 제약: 활성 상태면 category_sub_id NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_type_presets_active_requires_sub'
      AND conrelid = 'public.job_type_presets'::regclass
  ) THEN
    ALTER TABLE public.job_type_presets
      ADD CONSTRAINT job_type_presets_active_requires_sub
      CHECK (is_active = false OR category_sub_id IS NOT NULL);
  END IF;
END $$;

