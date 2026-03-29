-- 메인 키워드 1개만 데이터랩에 전송, 서브·제목 템플릿은 리포트 발행 시 스냅샷용

ALTER TABLE public.naver_trend_keyword_groups
  DROP CONSTRAINT IF EXISTS naver_trend_keyword_groups_keywords_check;

UPDATE public.naver_trend_keyword_groups
SET keywords = ARRAY[keywords[1]]
WHERE cardinality(keywords) > 1;

ALTER TABLE public.naver_trend_keyword_groups
  ADD CONSTRAINT naver_trend_keyword_groups_keywords_one CHECK (cardinality(keywords) = 1);

ALTER TABLE public.naver_trend_keyword_groups
  ADD COLUMN IF NOT EXISTS sub_keywords text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.naver_trend_keyword_groups
  ADD COLUMN IF NOT EXISTS title_templates text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.naver_trend_keyword_groups.sub_keywords IS '블로그 제목 파생용 서브 키워드(데이터랩 미사용)';
COMMENT ON COLUMN public.naver_trend_keyword_groups.title_templates IS '발행 시 랜덤 치환: {지역} {서브} {메인}';
