-- 노쇼 이의 제기: 구직자가 억울한 노쇼 처리 시 사유 등록
ALTER TABLE public.job_reports
  ADD COLUMN IF NOT EXISTS appealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_text TEXT;

COMMENT ON COLUMN public.job_reports.appealed_at IS '구직자 이의 제기 일시';
COMMENT ON COLUMN public.job_reports.appeal_text IS '구직자 이의 사유 (500자 이내 권장)';
