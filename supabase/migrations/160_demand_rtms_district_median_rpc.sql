-- 전국 시군구 RTMS 활동량 월별 중앙값 (허브·SEO — 1회 쿼리)

CREATE OR REPLACE FUNCTION public.demand_rtms_district_median_by_yyyymm(cutoff_yyyymm text)
RETURNS TABLE(yyyymm text, median_activity numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.yyyymm::text,
    percentile_cont(0.5) WITHIN GROUP (
      ORDER BY (m.jeonse_count::numeric * 0.7 + m.sale_count::numeric * 0.3)
    ) AS median_activity
  FROM public.demand_rtms_monthly m
  WHERE m.region_scope = 'district'
    AND m.yyyymm >= cutoff_yyyymm
    AND (m.sale_count > 0 OR m.jeonse_count > 0)
  GROUP BY m.yyyymm
  ORDER BY m.yyyymm;
$$;

REVOKE ALL ON FUNCTION public.demand_rtms_district_median_by_yyyymm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demand_rtms_district_median_by_yyyymm(text) TO anon, authenticated, service_role;
