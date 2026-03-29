-- 블로그 제목 파생용 평형·유형 토큰(10평, 원룸 등). 템플릿 {크기} 치환

ALTER TABLE public.naver_trend_keyword_groups
  ADD COLUMN IF NOT EXISTS size_keywords text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.naver_trend_keyword_groups.size_keywords IS '제목용 크기/유형(예 10평, 원룸). 서브와 함께 데카르트 곱으로 조합';
