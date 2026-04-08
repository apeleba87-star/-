-- 나라장터 낙찰정보(용역) 등 원천 JSON. 입찰공고 tenders와는 별도 행; 이후 공고키로 조인·정규화 가능.

CREATE TABLE IF NOT EXISTS public.tender_award_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL,
  source_record_id text NOT NULL,
  payload jsonb NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  is_clean_related boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tender_award_raw_source_record_unique UNIQUE (source_slug, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_tender_award_raw_source_fetched
  ON public.tender_award_raw (source_slug, last_fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_tender_award_raw_clean
  ON public.tender_award_raw (source_slug, is_clean_related)
  WHERE is_clean_related = true;

COMMENT ON TABLE public.tender_award_raw IS
  '낙찰·개찰 등 공공 API 원문(JSON). source_slug + 원본 복합키로 유일. categories/is_clean_related는 입찰공고와 동일 키워드 규칙으로 수집 시 계산.';

ALTER TABLE public.tender_award_raw ENABLE ROW LEVEL SECURITY;

-- 정책 없음: service_role(cron)만 upsert. anon/authenticated는 접근 불가.
