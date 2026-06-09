-- 입주레이더 광고 성과: 노출·클릭 원시 이벤트 + 일별 집계

CREATE TABLE IF NOT EXISTS public.radar_ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.radar_ad_slots(id) ON DELETE CASCADE,
  banner_id UUID NOT NULL REFERENCES public.radar_ad_banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'phone_click')),
  session_id TEXT,
  anon_visitor_id TEXT,
  page_path TEXT,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.radar_ad_events IS '입주레이더 광고 노출·클릭 원시 이벤트';
CREATE INDEX IF NOT EXISTS idx_radar_ad_events_slot_created
  ON public.radar_ad_events (slot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_ad_events_banner_created
  ON public.radar_ad_events (banner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_ad_events_created
  ON public.radar_ad_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.radar_ad_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stats_date DATE NOT NULL,
  slot_id UUID NOT NULL REFERENCES public.radar_ad_slots(id) ON DELETE CASCADE,
  banner_id UUID NOT NULL REFERENCES public.radar_ad_banners(id) ON DELETE CASCADE,
  impressions_raw INT NOT NULL DEFAULT 0,
  impressions_deduped INT NOT NULL DEFAULT 0,
  impressions_unique_daily INT NOT NULL DEFAULT 0,
  clicks_raw INT NOT NULL DEFAULT 0,
  clicks_deduped INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stats_date, slot_id)
);

COMMENT ON TABLE public.radar_ad_daily_stats IS '입주레이더 슬롯·일별 노출/클릭 집계';
CREATE INDEX IF NOT EXISTS idx_radar_ad_daily_stats_date ON public.radar_ad_daily_stats (stats_date DESC);
CREATE INDEX IF NOT EXISTS idx_radar_ad_daily_stats_slot ON public.radar_ad_daily_stats (slot_id, stats_date DESC);

ALTER TABLE public.radar_ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_ad_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radar_ad_events_insert" ON public.radar_ad_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "radar_ad_events_select_admin" ON public.radar_ad_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "radar_ad_daily_stats_select_admin" ON public.radar_ad_daily_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "radar_ad_daily_stats_admin_write" ON public.radar_ad_daily_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE OR REPLACE FUNCTION public.refresh_radar_ad_daily_stats(
  p_target_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ := p_target_date::TIMESTAMPTZ;
  v_end TIMESTAMPTZ := (p_target_date + 1)::TIMESTAMPTZ;
BEGIN
  INSERT INTO radar_ad_daily_stats (
    stats_date, slot_id, banner_id,
    impressions_raw, impressions_deduped, impressions_unique_daily,
    clicks_raw, clicks_deduped, updated_at
  )
  SELECT
    p_target_date,
    e.slot_id,
    e.banner_id,
    COUNT(*) FILTER (WHERE e.event_type = 'impression'),
    COUNT(DISTINCT e.session_id) FILTER (
      WHERE e.event_type = 'impression' AND e.session_id IS NOT NULL
    ),
    COUNT(DISTINCT e.anon_visitor_id) FILTER (
      WHERE e.event_type = 'impression' AND e.anon_visitor_id IS NOT NULL
    ),
    COUNT(*) FILTER (WHERE e.event_type IN ('click', 'phone_click')),
    COUNT(DISTINCT e.session_id) FILTER (
      WHERE e.event_type IN ('click', 'phone_click') AND e.session_id IS NOT NULL
    ),
    NOW()
  FROM radar_ad_events e
  WHERE e.created_at >= v_start AND e.created_at < v_end
  GROUP BY e.slot_id, e.banner_id
  ON CONFLICT (stats_date, slot_id) DO UPDATE SET
    banner_id = EXCLUDED.banner_id,
    impressions_raw = EXCLUDED.impressions_raw,
    impressions_deduped = EXCLUDED.impressions_deduped,
    impressions_unique_daily = EXCLUDED.impressions_unique_daily,
    clicks_raw = EXCLUDED.clicks_raw,
    clicks_deduped = EXCLUDED.clicks_deduped,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.refresh_radar_ad_daily_stats IS 'radar_ad_events → radar_ad_daily_stats (KST 일자 기준 호출 권장)';
