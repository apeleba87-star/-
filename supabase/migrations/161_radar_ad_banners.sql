-- 입주레이더 직거래 광고: 전국 1배너 + 지역별 배너, 배너당 슬롯 3개(로테이션)

CREATE TABLE IF NOT EXISTS public.radar_ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('national', 'regional')),
  /** national: null · regional: city:seoul | district:seoul:mapo-gu */
  region_key TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  rotation_seconds INT NOT NULL DEFAULT 10 CHECK (rotation_seconds >= 5 AND rotation_seconds <= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT radar_ad_banners_regional_region_chk CHECK (
    (scope = 'national' AND region_key IS NULL)
    OR (scope = 'regional' AND region_key IS NOT NULL AND length(trim(region_key)) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_radar_ad_banners_national_singleton
  ON public.radar_ad_banners (scope)
  WHERE scope = 'national';

CREATE UNIQUE INDEX IF NOT EXISTS idx_radar_ad_banners_regional_region
  ON public.radar_ad_banners (region_key)
  WHERE scope = 'regional';

COMMENT ON TABLE public.radar_ad_banners IS '입주레이더 광고 배너: 전국 1건 + 지역별 1건';

CREATE TABLE IF NOT EXISTS public.radar_ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES public.radar_ad_banners(id) ON DELETE CASCADE,
  slot_index INT NOT NULL CHECK (slot_index BETWEEN 1 AND 3),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('waste', 'restaurant', 'life', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT NOT NULL DEFAULT '자세히',
  cta_url TEXT NOT NULL,
  advertiser_name TEXT,
  monthly_fee INT,
  memo TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (banner_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_radar_ad_slots_banner_status
  ON public.radar_ad_slots (banner_id, status, start_date, end_date);

COMMENT ON TABLE public.radar_ad_slots IS '배너당 슬롯 1~3 — 화면에서 로테이션';

ALTER TABLE public.radar_ad_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radar_ad_banners_read" ON public.radar_ad_banners
  FOR SELECT USING (true);

CREATE POLICY "radar_ad_slots_read" ON public.radar_ad_slots
  FOR SELECT USING (true);

CREATE POLICY "radar_ad_banners_admin" ON public.radar_ad_banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "radar_ad_slots_admin" ON public.radar_ad_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

INSERT INTO public.radar_ad_banners (scope, region_key, enabled, rotation_seconds)
SELECT 'national', NULL, true, 10
WHERE NOT EXISTS (SELECT 1 FROM public.radar_ad_banners WHERE scope = 'national');
