-- 일간 집계: 리포트(aggregateDailyTenders)와 동일하게
-- 1) 활성 업종(primary 또는 tender_industries)에 해당하는 공고만 eligible
-- 2) 지역은 tender-utils.parseRegionSido 와 동일한 패턴 순서(tender_report_sido)

CREATE OR REPLACE FUNCTION public.tender_report_sido(p_bsns text, p_ntce text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN '기타'::text
    WHEN t ~ '서울특별시' OR t ~ '^서울' THEN '서울'
    WHEN t ~ '부산광역시' OR t ~ '^부산' THEN '부산'
    WHEN t ~ '대구광역시' OR t ~ '^대구' THEN '대구'
    WHEN t ~ '인천광역시' OR t ~ '^인천' THEN '인천'
    WHEN t ~ '광주광역시' OR t ~ '^광주' THEN '광주'
    WHEN t ~ '대전광역시' OR t ~ '^대전' THEN '대전'
    WHEN t ~ '울산광역시' OR t ~ '^울산' THEN '울산'
    WHEN t ~ '세종특별자치시' OR t ~ '^세종' THEN '세종'
    WHEN t ~ '경기도' OR t ~ '^경기' THEN '경기'
    WHEN t ~ '강원특별자치도' OR t ~ '강원도' OR t ~ '^강원' THEN '강원'
    WHEN t ~ '충청북도' OR t ~ '충북특별자치도' OR t ~ '^충북' THEN '충북'
    WHEN t ~ '충청남도' OR t ~ '충남특별자치도' OR t ~ '^충남' THEN '충남'
    WHEN t ~ '전북특별자치도' OR t ~ '전라북도' OR t ~ '^전북' THEN '전북'
    WHEN t ~ '전라남도' OR t ~ '^전남' THEN '전남'
    WHEN t ~ '경상북도' OR t ~ '^경북' THEN '경북'
    WHEN t ~ '경상남도' OR t ~ '^경남' THEN '경남'
    WHEN t ~ '제주특별자치도' OR t ~ '제주도' OR t ~ '^제주' THEN '제주'
    ELSE '기타'
  END
  FROM (
    SELECT COALESCE(
      NULLIF(BTRIM(COALESCE(p_bsns, '')), ''),
      NULLIF(BTRIM(COALESCE(p_ntce, '')), '')
    ) AS t
  ) x;
$$;

COMMENT ON FUNCTION public.tender_report_sido(text, text) IS
  'lib/tender-utils.parseRegionSido(bsns ?? ntce) 와 동일한 시·도 라벨 (리포트 집계용).';

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

-- 2026-03-26 일자 집계 재계산 (KST)
SELECT public.refresh_tender_daily_aggregate('2026-03-26'::date);

-- 해당 일자 자동 일간 글의 스냅샷 무효화 → 다음 조회 시 집계와 일치하도록 재생성
UPDATE public.posts
SET report_snapshot = NULL
WHERE source_type = 'auto_tender_daily'
  AND source_ref = '2026-03-26';
