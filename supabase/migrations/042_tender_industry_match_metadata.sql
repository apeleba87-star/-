-- 업종 매핑 근거·품질 추적 + 백필 시각 (최종 구현안)
-- tender_industries: match_source, raw_value
-- tenders: industry_match_status, industry_name_raw, industry_backfilled_at

-- 1. tender_industries 매핑 근거
ALTER TABLE public.tender_industries
  ADD COLUMN IF NOT EXISTS match_source TEXT,
  ADD COLUMN IF NOT EXISTS raw_value TEXT;

COMMENT ON COLUMN public.tender_industries.match_source IS 'direct_code | direct_name | alias';
COMMENT ON COLUMN public.tender_industries.raw_value IS 'raw에서 추출한 원문';

-- 2. tenders 업종·백필 보조
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS industry_match_status TEXT,
  ADD COLUMN IF NOT EXISTS industry_name_raw TEXT,
  ADD COLUMN IF NOT EXISTS industry_backfilled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenders.industry_match_status IS 'matched | alias_matched | unclassified';
COMMENT ON COLUMN public.tenders.industry_name_raw IS 'raw에서 찾은 업종 관련 원문';
COMMENT ON COLUMN public.tenders.industry_backfilled_at IS '업종 백필 처리 시각';
