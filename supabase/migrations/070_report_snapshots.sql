-- 리포트 스냅샷: 자동 생성된 구조화 리포트 저장. 글 발행 시 post와 연결.
-- docs/report-generation-and-management-implementation.md

CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.content_generation_runs(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content_full JSONB NOT NULL DEFAULT '{}',
  content_summary JSONB NOT NULL DEFAULT '{}',
  content_social TEXT,
  published_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_report_type ON report_snapshots(report_type);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_period_key ON report_snapshots(period_key);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_created ON report_snapshots(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_snapshots_type_period
  ON report_snapshots(report_type, period_key);

COMMENT ON TABLE public.report_snapshots IS '자동 생성 리포트 스냅샷. 주간 시장 요약 등. 글 발행 시 posts와 연결.';
COMMENT ON COLUMN public.report_snapshots.report_type IS 'weekly_market_summary | deadline_soon | prep_short | rebid_institutions 등';
COMMENT ON COLUMN public.report_snapshots.period_key IS '2026-03-18 | 2026-W12 | 2026-03 등';
COMMENT ON COLUMN public.report_snapshots.content_full IS '저장용 원본: 한줄결론, 핵심수치, TOP3, 실무해석, 다음행동 등';
COMMENT ON COLUMN public.report_snapshots.content_summary IS '화면용 요약';
COMMENT ON COLUMN public.report_snapshots.content_social IS '소셜용 축약 문장';
COMMENT ON COLUMN public.report_snapshots.published_post_id IS '글 발행 시 연결된 post id';

ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_snapshots_admin_all"
  ON public.report_snapshots FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );
