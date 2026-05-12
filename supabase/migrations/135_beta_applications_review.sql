-- 베타 지원: 관리자 검수 상태·태그·메모 + UPDATE RLS

ALTER TABLE public.beta_applications
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS review_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS admin_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.beta_applications
  DROP CONSTRAINT IF EXISTS beta_applications_review_status_check;

ALTER TABLE public.beta_applications
  ADD CONSTRAINT beta_applications_review_status_check
  CHECK (
    review_status IN (
      'new',
      'contacted',
      'qualified',
      'on_hold',
      'rejected',
      'converted'
    )
  );

COMMENT ON COLUMN public.beta_applications.review_status IS '관리자 검수 파이프라인 상태';
COMMENT ON COLUMN public.beta_applications.review_tags IS '관리자 태그 (ICP·후속조치 등)';
COMMENT ON COLUMN public.beta_applications.admin_note IS '관리자 내부 메모';
COMMENT ON COLUMN public.beta_applications.updated_at IS '관리자 수정 또는 행 갱신 시각';

CREATE INDEX IF NOT EXISTS idx_beta_applications_review_status
  ON public.beta_applications (review_status, pain_score DESC, created_at DESC);

DROP TRIGGER IF EXISTS trg_beta_applications_updated_at ON public.beta_applications;

CREATE OR REPLACE FUNCTION public.set_beta_applications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_beta_applications_updated_at
  BEFORE UPDATE ON public.beta_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_beta_applications_updated_at();

DROP POLICY IF EXISTS "beta_applications_update_admin" ON public.beta_applications;
CREATE POLICY "beta_applications_update_admin" ON public.beta_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );
