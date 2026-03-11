-- 콘텐츠 자동화: 실행 이력·중복 방지·실패 로그
-- docs/content-automation-design.md

-- 1. content_generation_runs (실행 메타 포함)
CREATE TABLE IF NOT EXISTS public.content_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,
  run_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  source_count INT,
  generated_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  payload JSONB,
  error_message TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  generator_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE(run_type, run_key)
);

CREATE INDEX IF NOT EXISTS idx_content_generation_runs_status ON content_generation_runs(status);
CREATE INDEX IF NOT EXISTS idx_content_generation_runs_created ON content_generation_runs(created_at DESC);

COMMENT ON TABLE public.content_generation_runs IS '자동 콘텐츠 생성 실행 이력. 중복 방지·재시도·템플릿 버전 추적용.';
COMMENT ON COLUMN public.content_generation_runs.attempt_count IS '동일 run_key 재시도 횟수';
COMMENT ON COLUMN public.content_generation_runs.started_at IS '실행 시작 시각';
COMMENT ON COLUMN public.content_generation_runs.generator_version IS '템플릿/로직 버전 (포맷 변경 이력 추적)';

-- 2. posts 확장: 자동 생성 글 구분
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS posts_auto_source_unique
  ON public.posts (source_type, source_ref)
  WHERE source_type IS NOT NULL AND source_ref IS NOT NULL;

COMMENT ON COLUMN public.posts.source_type IS 'auto_tender_daily | auto_tender_weekly | auto_tender_monthly 등';
COMMENT ON COLUMN public.posts.source_ref IS '2026-03-11 | 2026-W11 | 2026-03 등';

-- 3. RLS: 관리자만 content_generation_runs 조회 (cron은 service role로 insert/update)
ALTER TABLE public.content_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_generation_runs_admin_read"
  ON public.content_generation_runs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );
