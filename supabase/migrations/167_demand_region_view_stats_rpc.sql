-- 입주레이더 지역 조회: 월별 집계 RPC (어드민 — 전체 행 fetch 방지)

CREATE OR REPLACE FUNCTION public.demand_region_view_month_bounds(p_year_month TEXT)
RETURNS TABLE (start_date DATE, end_exclusive DATE)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    (p_year_month || '-01')::DATE AS start_date,
    ((p_year_month || '-01')::DATE + INTERVAL '1 month')::DATE AS end_exclusive
  WHERE p_year_month ~ '^\d{4}-\d{2}$';
$$;

CREATE OR REPLACE FUNCTION public.get_demand_region_view_stats(
  p_region_key TEXT,
  p_year_month TEXT
)
RETURNS TABLE (
  views_raw BIGINT,
  unique_sessions BIGINT,
  unique_visitors BIGINT,
  unique_logged_in_users BIGINT,
  hub_count BIGINT,
  region_scope_count BIGINT,
  seo_count BIGINT,
  share_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.session_id IS NOT NULL),
    COUNT(DISTINCT e.anon_visitor_id) FILTER (WHERE e.anon_visitor_id IS NOT NULL),
    COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE e.source = 'hub'),
    COUNT(*) FILTER (WHERE e.source = 'region_scope'),
    COUNT(*) FILTER (WHERE e.source = 'seo'),
    COUNT(*) FILTER (WHERE e.source = 'share')
  FROM demand_region_view_events e
  INNER JOIN demand_region_view_month_bounds(p_year_month) b ON TRUE
  WHERE e.region_key = p_region_key
    AND e.date_kst >= b.start_date
    AND e.date_kst < b.end_exclusive;
$$;

CREATE OR REPLACE FUNCTION public.get_demand_region_view_rank(
  p_year_month TEXT,
  p_limit INT DEFAULT 50,
  p_key_prefix TEXT DEFAULT 'district:'
)
RETURNS TABLE (
  region_key TEXT,
  views_raw BIGINT,
  unique_sessions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.region_key,
    COUNT(*)::BIGINT AS views_raw,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.session_id IS NOT NULL) AS unique_sessions
  FROM demand_region_view_events e
  INNER JOIN demand_region_view_month_bounds(p_year_month) b ON TRUE
  WHERE e.region_key LIKE p_key_prefix || '%'
  GROUP BY e.region_key
  ORDER BY views_raw DESC, unique_sessions DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;

COMMENT ON FUNCTION public.get_demand_region_view_stats IS 'KST 월·region_key 단일 지역 조회 집계';
COMMENT ON FUNCTION public.get_demand_region_view_rank IS 'KST 월 region_key prefix별 조회 순위 (district:/city:/national)';
