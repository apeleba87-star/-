-- 네이버 데이터랩 검색어 트렌드 기반 마케팅 리포트

CREATE TABLE IF NOT EXISTS public.naver_trend_keyword_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  keywords text[] NOT NULL CHECK (cardinality(keywords) >= 1 AND cardinality(keywords) <= 20),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_naver_trend_keyword_groups_active_sort
  ON public.naver_trend_keyword_groups (is_active, sort_order, group_name);

COMMENT ON TABLE public.naver_trend_keyword_groups IS '데이터랩 API keywordGroups 항목(관리자 관리)';

CREATE TABLE IF NOT EXISTS public.naver_trend_datapoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_group_id uuid NOT NULL REFERENCES public.naver_trend_keyword_groups (id) ON DELETE CASCADE,
  window_end_date date NOT NULL,
  period_date date NOT NULL,
  ratio double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (keyword_group_id, window_end_date, period_date)
);

CREATE INDEX IF NOT EXISTS idx_naver_trend_datapoints_window
  ON public.naver_trend_datapoints (window_end_date DESC);

COMMENT ON TABLE public.naver_trend_datapoints IS '데이터랩 일별 ratio 스냅샷(윈도우 종료일 기준)';

CREATE TABLE IF NOT EXISTS public.naver_trend_daily_reports (
  report_date date PRIMARY KEY,
  headline text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  fetch_error text NULL
);

COMMENT ON TABLE public.naver_trend_daily_reports IS '일일 마케팅 리포트(공개 페이지용 JSON)';

ALTER TABLE public.naver_trend_keyword_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naver_trend_datapoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naver_trend_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "naver_trend_keyword_groups_admin_all" ON public.naver_trend_keyword_groups
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  );

CREATE POLICY "naver_trend_daily_reports_read" ON public.naver_trend_daily_reports
  FOR SELECT USING (true);

-- datapoints: RLS 활성화만 하고 정책 없음 → 일반 사용자 접근 불가, service_role(cron)은 RLS 우회
