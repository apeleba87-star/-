-- 공공데이터 등 외부 일자리 원천 수집 (정규화·job_posts 반영은 후속 단계)

CREATE TABLE IF NOT EXISTS public.job_open_data_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL,
  source_record_id text NOT NULL,
  payload jsonb NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_open_data_raw_source_record_unique UNIQUE (source_slug, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_job_open_data_raw_source_fetched
  ON public.job_open_data_raw (source_slug, last_fetched_at DESC);

COMMENT ON TABLE public.job_open_data_raw IS
  '공공 API·파일 등에서 수집한 일자리 원문(필드→JSON). 소스별 source_slug + 원본 ID로 유일. 정규화 파이프라인이 별도로 가공.';

ALTER TABLE public.job_open_data_raw ENABLE ROW LEVEL SECURITY;

-- 정책 없음: anon/authenticated 접근 불가. service_role(cron)은 RLS 우회로 upsert.
