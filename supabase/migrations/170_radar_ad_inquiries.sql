-- 입주레이더 직거래 배너 광고 문의 (공개 제출 → API service role)

CREATE TABLE IF NOT EXISTS public.radar_ad_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('national', 'regional', 'both')),
  region_interest TEXT,
  category TEXT CHECK (category IS NULL OR category IN ('waste', 'restaurant', 'life', 'other')),
  message TEXT,
  consent_personal BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  admin_note TEXT,
  source_path TEXT NOT NULL DEFAULT '/advertise',
  page_path TEXT,
  meta JSONB NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE public.radar_ad_inquiries IS '입주레이더 배너 광고 문의 — INSERT는 API(service role)만';

CREATE INDEX IF NOT EXISTS idx_radar_ad_inquiries_created
  ON public.radar_ad_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_ad_inquiries_status_created
  ON public.radar_ad_inquiries (status, created_at DESC);

ALTER TABLE public.radar_ad_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radar_ad_inquiries_select_admin" ON public.radar_ad_inquiries;
CREATE POLICY "radar_ad_inquiries_select_admin" ON public.radar_ad_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "radar_ad_inquiries_admin_write" ON public.radar_ad_inquiries;
CREATE POLICY "radar_ad_inquiries_admin_write" ON public.radar_ad_inquiries
  FOR ALL USING (
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
