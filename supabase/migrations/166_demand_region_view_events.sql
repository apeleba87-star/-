-- 입주레이더 지역 조회 이벤트 (로그인·비로그인, 광고 단가·수요 분석용)

CREATE TABLE IF NOT EXISTS public.demand_region_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('hub', 'region_scope', 'seo', 'share')),
  date_kst DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  anon_visitor_id TEXT,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.demand_region_view_events IS '입주레이더 region_key 조회 원시 이벤트 (KST date_kst)';
COMMENT ON COLUMN public.demand_region_view_events.region_key IS 'demandRegionSelectionKey 형식 (예: district:seoul:gangseo-gu)';

CREATE INDEX IF NOT EXISTS idx_demand_region_view_events_region_month
  ON public.demand_region_view_events (region_key, date_kst DESC);

CREATE INDEX IF NOT EXISTS idx_demand_region_view_events_month
  ON public.demand_region_view_events (date_kst DESC, region_key);

ALTER TABLE public.demand_region_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demand_region_view_events_insert"
  ON public.demand_region_view_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "demand_region_view_events_select_admin"
  ON public.demand_region_view_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );
