-- 마감링크 공고 신고 + 운영자 조치

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS magam_suspended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.magam_suspended_at IS '마감링크 이용 정지 시각 — 글쓰기·노출 차단';

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS admin_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_closed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_close_reason TEXT;

COMMENT ON COLUMN public.magam_listings.admin_closed_at IS '운영자 강제 마감 시각';
COMMENT ON COLUMN public.magam_listings.admin_close_reason IS '운영자 강제 마감 사유';

CREATE TABLE IF NOT EXISTS public.magam_listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.magam_listings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason_type TEXT NOT NULL CHECK (
    reason_type IN ('illegal', 'fake', 'spam', 'harassment', 'other')
  ),
  reason_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'dismissed', 'actioned')
  ),
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.magam_listing_reports IS '마감링크 공고 신고 — 운영자 검토 큐';

CREATE INDEX IF NOT EXISTS idx_magam_listing_reports_status_created
  ON public.magam_listing_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_magam_listing_reports_listing
  ON public.magam_listing_reports (listing_id, created_at DESC);

ALTER TABLE public.magam_listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magam_listing_reports_insert" ON public.magam_listing_reports;
CREATE POLICY "magam_listing_reports_insert" ON public.magam_listing_reports
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "magam_listing_reports_select_own" ON public.magam_listing_reports;
CREATE POLICY "magam_listing_reports_select_own" ON public.magam_listing_reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "admin_magam_listing_reports" ON public.magam_listing_reports;
CREATE POLICY "admin_magam_listing_reports" ON public.magam_listing_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

GRANT SELECT, INSERT ON public.magam_listing_reports TO anon, authenticated;
