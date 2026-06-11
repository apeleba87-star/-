-- 당일(window_days=1) 일당 리포트 시계열 — 기간 평균·지역 추이·1년 차트용 (payload JSONB 파싱 없이 조회)

CREATE TABLE IF NOT EXISTS public.job_wage_daily_national_metrics (
  report_date date PRIMARY KEY,
  window_days smallint NOT NULL DEFAULT 1 CHECK (window_days = 1),
  dominant_category_key text,
  dominant_category_name text,
  dominant_position_count integer NOT NULL DEFAULT 0,
  total_new_position_count integer NOT NULL DEFAULT 0,
  job_post_count integer NOT NULL DEFAULT 0,
  national_weighted_avg_wage integer,
  top_province text,
  top_province_avg_wage integer,
  bottom_province text,
  bottom_province_avg_wage integer,
  computed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_wage_daily_national_metrics IS
  '당일 일당 리포트 전국 요약. report_date당 1행, 크론 재실행 시 갱신.';

CREATE TABLE IF NOT EXISTS public.job_wage_daily_province_metrics (
  report_date date NOT NULL,
  province text NOT NULL,
  avg_daily_wage integer NOT NULL,
  job_post_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (report_date, province)
);

COMMENT ON TABLE public.job_wage_daily_province_metrics IS
  '당일 일당 리포트 시·도별 평균. report_date+province당 1행.';

CREATE INDEX IF NOT EXISTS idx_job_wage_daily_national_metrics_date_desc
  ON public.job_wage_daily_national_metrics (report_date DESC);

CREATE INDEX IF NOT EXISTS idx_job_wage_daily_province_metrics_province_date
  ON public.job_wage_daily_province_metrics (province, report_date DESC);

ALTER TABLE public.job_wage_daily_national_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_wage_daily_province_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_wage_daily_national_metrics_read
  ON public.job_wage_daily_national_metrics FOR SELECT USING (true);

CREATE POLICY job_wage_daily_province_metrics_read
  ON public.job_wage_daily_province_metrics FOR SELECT USING (true);
