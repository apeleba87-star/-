-- 업종별 키워드·공고 카테고리 (청소 / 소독·방역 / 추후 확장)

-- 키워드에 업종(카테고리) 구분 추가. NULL = 공통 제외
ALTER TABLE public.tender_keywords
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.tender_keywords
  DROP CONSTRAINT IF EXISTS tender_keywords_category_check;

ALTER TABLE public.tender_keywords
  ADD CONSTRAINT tender_keywords_category_check
  CHECK (category IS NULL OR category IN ('cleaning', 'disinfection'));

-- 기존 포함 키워드 = 청소 관련
UPDATE public.tender_keywords SET category = 'cleaning' WHERE keyword_type = 'include' AND (category IS NULL OR category = '');
-- 기존 제외 키워드 = 공통 제외
UPDATE public.tender_keywords SET category = NULL WHERE keyword_type = 'exclude';

-- 소독·방역 포함 키워드 초기 데이터
INSERT INTO public.tender_keywords (keyword, sort_order, enabled, keyword_type, category) VALUES
  ('소독', 10, true, 'include', 'disinfection'),
  ('방역', 11, true, 'include', 'disinfection'),
  ('방역소독', 12, true, 'include', 'disinfection'),
  ('살충', 13, true, 'include', 'disinfection'),
  ('해충방제', 14, true, 'include', 'disinfection'),
  ('소독방역', 15, true, 'include', 'disinfection')
ON CONFLICT (keyword) DO UPDATE SET keyword_type = EXCLUDED.keyword_type, category = EXCLUDED.category, enabled = EXCLUDED.enabled;

-- 공고에 속한 업종 목록 (배열). 기존 is_clean_related 유지로 하위 호환
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tenders_categories ON tenders USING GIN (categories);

COMMENT ON COLUMN public.tender_keywords.category IS 'cleaning=청소, disinfection=소독·방역, NULL=공통 제외';
COMMENT ON COLUMN public.tenders.categories IS '해당 공고가 속한 업종 코드: cleaning, disinfection 등';
