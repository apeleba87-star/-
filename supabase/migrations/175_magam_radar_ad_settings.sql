-- 마감앱 직거래 배너 노출 — 웹(입주레이더·채용)과 별도 on/off

CREATE TABLE IF NOT EXISTS public.magam_radar_ad_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  national_enabled BOOLEAN NOT NULL DEFAULT false,
  regional_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.magam_radar_ad_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.magam_radar_ad_settings IS
  '마감앱 전국·지역 직거래 배너 노출 스위치 — 기본 꺼짐';

ALTER TABLE public.magam_radar_ad_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magam_radar_ad_settings_select" ON public.magam_radar_ad_settings;
CREATE POLICY "magam_radar_ad_settings_select" ON public.magam_radar_ad_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "magam_radar_ad_settings_admin_update" ON public.magam_radar_ad_settings;
CREATE POLICY "magam_radar_ad_settings_admin_update" ON public.magam_radar_ad_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );
