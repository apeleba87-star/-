-- 입주레이더: 로그인 사용자 일일 지역 full view (KST 기준, region_key당 1회)

CREATE TABLE IF NOT EXISTS public.demand_region_daily_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_kst DATE NOT NULL,
  region_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date_kst, region_key)
);

CREATE INDEX IF NOT EXISTS idx_demand_region_daily_views_user_date
  ON public.demand_region_daily_views(user_id, date_kst DESC);

ALTER TABLE public.demand_region_daily_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demand_region_daily_views_select_own" ON public.demand_region_daily_views;
CREATE POLICY "demand_region_daily_views_select_own"
  ON public.demand_region_daily_views FOR SELECT
  USING (auth.uid() = user_id);
