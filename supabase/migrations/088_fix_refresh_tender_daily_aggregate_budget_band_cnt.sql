-- 087에서 budget_band_breakdown 서브쿼리(UNION 첫 분기) 세 번째 열에 AS cnt 누락으로
-- "column b.cnt does not exist" 발생 — 이미 배포된 환경에서 함수만 교체.

CREATE OR REPLACE FUNCTION public.refresh_tender_daily_aggregate(p_day_kst DATE)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  IF p_day_kst IS NULL THEN
    RAISE EXCEPTION 'p_day_kst is required';
  END IF;

  v_start := (p_day_kst::text || ' 00:00:00+09')::timestamptz;
  v_end := (p_day_kst::text || ' 23:59:59.999+09')::timestamptz;

  INSERT INTO public.tender_daily_aggregates (
    day_kst, count_total, budget_total, has_budget_unknown,
    region_breakdown, industry_breakdown, top_industry, agency_breakdown, budget_band_breakdown, refreshed_at
  )
  WITH eligible AS (
    SELECT t.*
    FROM public.tenders t
    WHERE t.bid_ntce_dt >= v_start AND t.bid_ntce_dt <= v_end
      AND (
        EXISTS (
          SELECT 1 FROM public.industries i
          WHERE i.is_active AND i.code = t.primary_industry_code
        )
        OR EXISTS (
          SELECT 1
          FROM public.tender_industries ti
          INNER JOIN public.industries ind ON ind.code = ti.industry_code AND ind.is_active
          WHERE ti.tender_id = t.id
        )
      )
  )
  SELECT
    p_day_kst AS day_kst,
    (SELECT COUNT(*)::INT FROM eligible) AS count_total,
    COALESCE((SELECT SUM(COALESCE(e.base_amt, 0))::NUMERIC FROM eligible e), 0) AS budget_total,
    COALESCE((SELECT BOOL_OR(e.base_amt IS NULL) FROM eligible e), false) AS has_budget_unknown,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', r.name, 'count', r.cnt) ORDER BY r.cnt DESC)
      FROM (
        SELECT public.tender_report_sido(e.bsns_dstr_nm, e.ntce_instt_nm) AS name, COUNT(*)::INT AS cnt
        FROM eligible e
        GROUP BY 1
      ) r
    ), '[]'::jsonb) AS region_breakdown,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('industry_code', x.code, 'industry_name', x.name, 'count', x.cnt)
        ORDER BY x.sort_order ASC
      )
      FROM (
        SELECT i.code, i.name, i.sort_order,
          (
            SELECT COUNT(*)::INT FROM eligible e
            WHERE e.primary_industry_code = i.code
              OR EXISTS (
                SELECT 1 FROM public.tender_industries ti
                WHERE ti.tender_id = e.id AND ti.industry_code = i.code
              )
          ) AS cnt
        FROM public.industries i
        WHERE i.is_active
      ) x
    ), '[]'::jsonb) AS industry_breakdown,
    (
      SELECT CASE WHEN y.cnt IS NULL OR y.cnt = 0 THEN NULL
        ELSE jsonb_build_object('code', y.code, 'name', y.name, 'count', y.cnt) END
      FROM (
        SELECT i2.code, i2.name, i2.sort_order,
          (
            SELECT COUNT(*)::INT FROM eligible e
            WHERE e.primary_industry_code = i2.code
              OR EXISTS (
                SELECT 1 FROM public.tender_industries ti
                WHERE ti.tender_id = e.id AND ti.industry_code = i2.code
              )
          ) AS cnt
        FROM public.industries i2
        WHERE i2.is_active
        ORDER BY cnt DESC NULLS LAST, i2.sort_order ASC
        LIMIT 1
      ) y
    ) AS top_industry,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', a.name, 'count', a.cnt) ORDER BY a.cnt DESC)
      FROM (
        SELECT COALESCE(NULLIF(TRIM(e.ntce_instt_nm), ''), '기타') AS name, COUNT(*)::INT AS cnt
        FROM eligible e
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 8
      ) a
    ), '[]'::jsonb) AS agency_breakdown,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', b.label, 'count', b.cnt) ORDER BY b.sort_order)
      FROM (
        SELECT 1 AS sort_order, '1천만원 미만'::TEXT AS label,
          (SELECT COUNT(*)::INT FROM eligible e WHERE COALESCE(e.base_amt, 0) > 0 AND COALESCE(e.base_amt, 0) < 10000000) AS cnt
        UNION ALL
        SELECT 2, '1천만~5천만원'::text,
          (SELECT COUNT(*)::INT FROM eligible e WHERE e.base_amt >= 10000000 AND e.base_amt < 50000000)
        UNION ALL
        SELECT 3, '5천만~1억원'::text,
          (SELECT COUNT(*)::INT FROM eligible e WHERE e.base_amt >= 50000000 AND e.base_amt < 100000000)
        UNION ALL
        SELECT 4, '1억원 이상'::text,
          (SELECT COUNT(*)::INT FROM eligible e WHERE e.base_amt >= 100000000)
        UNION ALL
        SELECT 5, '금액 미기재'::text,
          (SELECT COUNT(*)::INT FROM eligible e WHERE e.base_amt IS NULL OR e.base_amt <= 0)
      ) b
    ), '[]'::jsonb) AS budget_band_breakdown,
    NOW() AS refreshed_at
  ON CONFLICT (day_kst) DO UPDATE
  SET
    count_total = EXCLUDED.count_total,
    budget_total = EXCLUDED.budget_total,
    has_budget_unknown = EXCLUDED.has_budget_unknown,
    region_breakdown = EXCLUDED.region_breakdown,
    industry_breakdown = EXCLUDED.industry_breakdown,
    top_industry = EXCLUDED.top_industry,
    agency_breakdown = EXCLUDED.agency_breakdown,
    budget_band_breakdown = EXCLUDED.budget_band_breakdown,
    refreshed_at = NOW();
END;
$$;
