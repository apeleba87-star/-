-- 관리자 키워드: include(포함 검색) / exclude(제외·오매칭 방지)
ALTER TABLE public.tender_keywords
  ADD COLUMN IF NOT EXISTS keyword_type TEXT NOT NULL DEFAULT 'include';

ALTER TABLE public.tender_keywords
  DROP CONSTRAINT IF EXISTS tender_keywords_keyword_type_check;

ALTER TABLE public.tender_keywords
  ADD CONSTRAINT tender_keywords_keyword_type_check
  CHECK (keyword_type IN ('include', 'exclude'));

-- 기존 행은 모두 포함용
UPDATE public.tender_keywords SET keyword_type = 'include' WHERE keyword_type IS NULL OR keyword_type = '';

-- 제외용 키워드: '청소'가 '청소년'에 매칭되는 것 방지, 그 외 비관련 공고 제외
INSERT INTO public.tender_keywords (keyword, sort_order, enabled, keyword_type) VALUES
  ('청소년', 100, true, 'exclude'),
  ('뉴스클리핑', 101, true, 'exclude'),
  ('뉴스스크랩', 102, true, 'exclude'),
  ('연구용역', 103, true, 'exclude'),
  ('설계', 104, true, 'exclude')
ON CONFLICT (keyword) DO UPDATE SET keyword_type = EXCLUDED.keyword_type, enabled = EXCLUDED.enabled;

COMMENT ON COLUMN public.tender_keywords.keyword_type IS 'include: 청소 관련 매칭용, exclude: 제외·오매칭 방지(예: 청소년)';
