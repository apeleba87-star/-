-- 청소 관련 필터: 점수·수동 오버라이드 컬럼 추가

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS is_clean_related BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clean_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clean_reason JSONB,
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manual_tag BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_tenders_is_clean_related ON tenders(is_clean_related);
CREATE INDEX IF NOT EXISTS idx_tenders_clean_score ON tenders(clean_score);

COMMENT ON COLUMN public.tenders.is_clean_related IS '청소 관련 여부 (점수 60+ 또는 manual_override 시 manual_tag)';
COMMENT ON COLUMN public.tenders.clean_score IS '청소 관련 점수 (high/mid 포함, 제외 키워드 반영)';
COMMENT ON COLUMN public.tenders.clean_reason IS '매칭된 키워드·필드·제외 내역';
COMMENT ON COLUMN public.tenders.manual_override IS '수동 판별 사용 시 true';
COMMENT ON COLUMN public.tenders.manual_tag IS '수동 지정 시 청소 관련 여부 (manual_override=true일 때만 사용)';
