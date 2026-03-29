-- 구인 신규 포지션 기준 일당 일간 스냅샷(공개 리포트)

CREATE TABLE IF NOT EXISTS public.job_wage_daily_reports (
  report_date date PRIMARY KEY,
  headline text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  fetch_error text NULL
);

COMMENT ON TABLE public.job_wage_daily_reports IS 'KST 전일 0~24시 신규 포지션·대표 일당(공고당 max) 집계 스냅샷';

ALTER TABLE public.job_wage_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_wage_daily_reports_read" ON public.job_wage_daily_reports
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_job_post_positions_created_at
  ON public.job_post_positions (created_at DESC);
