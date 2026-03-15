-- 광고 성과 수집: 원시 이벤트(ad_events) + 일별 집계(ad_daily_stats)
-- docs/direct-ad-performance-report-basis.md

-- 1) 원시 이벤트 테이블
CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.home_ad_campaigns(id) ON DELETE SET NULL,
  slot_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression', 'viewable_impression', 'click',
    'phone_click', 'website_click', 'inquiry_submit', 'quote_request_submit', 'kakao_click'
  )),
  session_id TEXT,
  anon_visitor_id TEXT,
  page_path TEXT,
  referrer TEXT,
  user_agent_hash TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ad_events IS '광고 성과 원시 이벤트. 노출/클릭/전환 등 확장 가능';
COMMENT ON COLUMN public.ad_events.event_type IS '1단계: impression, viewable_impression, click';
CREATE INDEX IF NOT EXISTS idx_ad_events_campaign_slot_created ON ad_events(campaign_id, slot_key, created_at);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_events_session ON ad_events(session_id, created_at) WHERE session_id IS NOT NULL;

-- 2) 일별 집계 테이블 (리포트/대시보드용)
CREATE TABLE IF NOT EXISTS public.ad_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stats_date DATE NOT NULL,
  campaign_id UUID REFERENCES public.home_ad_campaigns(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  impressions_raw INT NOT NULL DEFAULT 0,
  impressions_deduped INT NOT NULL DEFAULT 0,
  clicks_raw INT NOT NULL DEFAULT 0,
  clicks_deduped INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stats_date, campaign_id, slot_key)
);

COMMENT ON TABLE public.ad_daily_stats IS '캠페인·슬롯·일별 노출/클릭 집계. 리포트 조회용';
CREATE INDEX IF NOT EXISTS idx_ad_daily_stats_date ON ad_daily_stats(stats_date);
CREATE INDEX IF NOT EXISTS idx_ad_daily_stats_campaign ON ad_daily_stats(campaign_id, stats_date);

-- 3) RLS
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_daily_stats ENABLE ROW LEVEL SECURITY;

-- 누구나 이벤트 삽입 가능 (수집용). 조회는 관리자만
DROP POLICY IF EXISTS "ad_events_insert" ON public.ad_events;
CREATE POLICY "ad_events_insert" ON public.ad_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "ad_events_select_admin" ON public.ad_events;
CREATE POLICY "ad_events_select_admin" ON public.ad_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

DROP POLICY IF EXISTS "ad_daily_stats_select_admin" ON public.ad_daily_stats;
CREATE POLICY "ad_daily_stats_select_admin" ON public.ad_daily_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
DROP POLICY IF EXISTS "ad_daily_stats_all_admin" ON public.ad_daily_stats;
CREATE POLICY "ad_daily_stats_all_admin" ON public.ad_daily_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- 4) 집계 함수: ad_events → ad_daily_stats (일별 raw/deduped)
-- 직접 수주 캠페인(campaign_id NOT NULL)만 집계. dedup은 session_id 기준.
CREATE OR REPLACE FUNCTION public.refresh_ad_daily_stats(p_target_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := p_target_date;
  v_start TIMESTAMPTZ := v_date::TIMESTAMPTZ;
  v_end   TIMESTAMPTZ := (v_date + 1)::TIMESTAMPTZ;
BEGIN
  INSERT INTO ad_daily_stats (stats_date, campaign_id, slot_key, impressions_raw, impressions_deduped, clicks_raw, clicks_deduped, updated_at)
  SELECT
    v_date,
    k.campaign_id,
    k.slot_key,
    COALESCE(ir.cnt, 0),
    COALESCE(id.cnt, 0),
    COALESCE(cr.cnt, 0),
    COALESCE(cd.cnt, 0),
    NOW()
  FROM (
    SELECT DISTINCT campaign_id, slot_key
    FROM ad_events
    WHERE created_at >= v_start AND created_at < v_end AND campaign_id IS NOT NULL
  ) k
  LEFT JOIN (
    SELECT campaign_id, slot_key, COUNT(*) AS cnt
    FROM ad_events
    WHERE created_at >= v_start AND created_at < v_end
      AND event_type IN ('impression', 'viewable_impression') AND campaign_id IS NOT NULL
    GROUP BY campaign_id, slot_key
  ) ir ON k.campaign_id = ir.campaign_id AND k.slot_key = ir.slot_key
  LEFT JOIN (
    SELECT campaign_id, slot_key, COUNT(DISTINCT session_id) AS cnt
    FROM ad_events
    WHERE created_at >= v_start AND created_at < v_end
      AND event_type IN ('impression', 'viewable_impression')
      AND campaign_id IS NOT NULL AND session_id IS NOT NULL AND session_id <> ''
    GROUP BY campaign_id, slot_key
  ) id ON k.campaign_id = id.campaign_id AND k.slot_key = id.slot_key
  LEFT JOIN (
    SELECT campaign_id, slot_key, COUNT(*) AS cnt
    FROM ad_events
    WHERE created_at >= v_start AND created_at < v_end
      AND event_type = 'click' AND campaign_id IS NOT NULL
    GROUP BY campaign_id, slot_key
  ) cr ON k.campaign_id = cr.campaign_id AND k.slot_key = cr.slot_key
  LEFT JOIN (
    SELECT campaign_id, slot_key, COUNT(DISTINCT session_id) AS cnt
    FROM ad_events
    WHERE created_at >= v_start AND created_at < v_end
      AND event_type = 'click'
      AND campaign_id IS NOT NULL AND session_id IS NOT NULL AND session_id <> ''
    GROUP BY campaign_id, slot_key
  ) cd ON k.campaign_id = cd.campaign_id AND k.slot_key = cd.slot_key
  ON CONFLICT (stats_date, campaign_id, slot_key) DO UPDATE SET
    impressions_raw = EXCLUDED.impressions_raw,
    impressions_deduped = EXCLUDED.impressions_deduped,
    clicks_raw = EXCLUDED.clicks_raw,
    clicks_deduped = EXCLUDED.clicks_deduped,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.refresh_ad_daily_stats IS '지정일(기본: 어제) ad_events를 집계해 ad_daily_stats 반영';
