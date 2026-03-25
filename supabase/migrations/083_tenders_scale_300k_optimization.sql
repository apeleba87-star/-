-- 300k+ 입찰공고 운영을 위한 저장/조회 최적화

-- 1) 중복방지 키(업서트 키) 재확인
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenders_bid_no_ord_unique
  ON public.tenders (bid_ntce_no, bid_ntce_ord);

-- 2) 자주 쓰는 조건 인덱스 강화
CREATE INDEX IF NOT EXISTS idx_tenders_bid_ntce_dt_desc
  ON public.tenders (bid_ntce_dt DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tenders_bid_clse_dt_asc
  ON public.tenders (bid_clse_dt ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tenders_primary_industry_code
  ON public.tenders (primary_industry_code)
  WHERE primary_industry_code IS NOT NULL;

-- region 요구사항 대응: 기존 원문 지역 + 정규화 지역 배열 모두 인덱싱
CREATE INDEX IF NOT EXISTS idx_tenders_bsns_dstr_nm
  ON public.tenders (bsns_dstr_nm);

CREATE INDEX IF NOT EXISTS idx_tenders_region_sido_list_gin
  ON public.tenders USING GIN (region_sido_list);

-- 3) 원문(raw) 분리 테이블
CREATE TABLE IF NOT EXISTS public.tender_raw_payloads (
  tender_id UUID PRIMARY KEY REFERENCES public.tenders(id) ON DELETE CASCADE,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenders ALTER COLUMN raw SET COMPRESSION lz4;
ALTER TABLE public.tender_raw_payloads ALTER COLUMN raw SET COMPRESSION lz4;

CREATE INDEX IF NOT EXISTS idx_tender_raw_payloads_updated
  ON public.tender_raw_payloads(updated_at DESC);

ALTER TABLE public.tender_raw_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tender_raw_payloads_read" ON public.tender_raw_payloads;
CREATE POLICY "tender_raw_payloads_read"
  ON public.tender_raw_payloads FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "tender_raw_payloads_write" ON public.tender_raw_payloads;
CREATE POLICY "tender_raw_payloads_write"
  ON public.tender_raw_payloads FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4) 리포트 집계 테이블(원시 tenders 풀스캔 완화)
CREATE TABLE IF NOT EXISTS public.tender_daily_aggregates (
  day_kst DATE PRIMARY KEY,
  count_total INT NOT NULL DEFAULT 0,
  budget_total NUMERIC NOT NULL DEFAULT 0,
  has_budget_unknown BOOLEAN NOT NULL DEFAULT false,
  region_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  industry_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_industry JSONB,
  agency_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  budget_band_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_daily_aggregates_refreshed
  ON public.tender_daily_aggregates(refreshed_at DESC);

ALTER TABLE public.tender_daily_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tender_daily_aggregates_read" ON public.tender_daily_aggregates;
CREATE POLICY "tender_daily_aggregates_read"
  ON public.tender_daily_aggregates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "tender_daily_aggregates_write" ON public.tender_daily_aggregates;
CREATE POLICY "tender_daily_aggregates_write"
  ON public.tender_daily_aggregates FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5) KST 일자 단위 집계 갱신 함수
CREATE OR REPLACE FUNCTION public.refresh_tender_daily_aggregate(p_day_kst DATE)
RETURNS VOID
LANGUAGE plpgsql
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
  SELECT
    p_day_kst AS day_kst,
    COUNT(*)::INT AS count_total,
    COALESCE(SUM(COALESCE(t.base_amt, 0)), 0)::NUMERIC AS budget_total,
    BOOL_OR(t.base_amt IS NULL) AS has_budget_unknown,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', r.name, 'count', r.cnt) ORDER BY r.cnt DESC)
      FROM (
        SELECT COALESCE(NULLIF(split_part(t2.bsns_dstr_nm, ' ', 1), ''), '기타') AS name, COUNT(*)::INT AS cnt
        FROM public.tenders t2
        WHERE t2.bid_ntce_dt >= v_start AND t2.bid_ntce_dt <= v_end
        GROUP BY 1
      ) r
    ), '[]'::jsonb) AS region_breakdown,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('industry_code', i.code, 'industry_name', i.name, 'count', COALESCE(x.cnt, 0)) ORDER BY i.sort_order ASC)
      FROM public.industries i
      LEFT JOIN (
        SELECT COALESCE(ti.industry_code, t3.primary_industry_code) AS code, COUNT(DISTINCT t3.id)::INT AS cnt
        FROM public.tenders t3
        LEFT JOIN public.tender_industries ti ON ti.tender_id = t3.id
        WHERE t3.bid_ntce_dt >= v_start AND t3.bid_ntce_dt <= v_end
        GROUP BY 1
      ) x ON x.code = i.code
      WHERE i.is_active = true
    ), '[]'::jsonb) AS industry_breakdown,
    (
      SELECT CASE WHEN y.code IS NULL THEN NULL
        ELSE jsonb_build_object('code', y.code, 'name', i2.name, 'count', y.cnt) END
      FROM (
        SELECT COALESCE(ti.industry_code, t4.primary_industry_code) AS code, COUNT(DISTINCT t4.id)::INT AS cnt
        FROM public.tenders t4
        LEFT JOIN public.tender_industries ti ON ti.tender_id = t4.id
        WHERE t4.bid_ntce_dt >= v_start AND t4.bid_ntce_dt <= v_end
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 1
      ) y
      LEFT JOIN public.industries i2 ON i2.code = y.code
    ) AS top_industry,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', a.name, 'count', a.cnt) ORDER BY a.cnt DESC)
      FROM (
        SELECT COALESCE(NULLIF(TRIM(t5.ntce_instt_nm), ''), '기타') AS name, COUNT(*)::INT AS cnt
        FROM public.tenders t5
        WHERE t5.bid_ntce_dt >= v_start AND t5.bid_ntce_dt <= v_end
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 8
      ) a
    ), '[]'::jsonb) AS agency_breakdown,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', b.label, 'count', b.cnt) ORDER BY b.sort_order)
      FROM (
        SELECT 1 AS sort_order, '1천만원 미만'::TEXT AS label, COUNT(*) FILTER (WHERE t6.base_amt > 0 AND t6.base_amt < 10000000)::INT AS cnt
        FROM public.tenders t6
        WHERE t6.bid_ntce_dt >= v_start AND t6.bid_ntce_dt <= v_end
        UNION ALL
        SELECT 2, '1천만~5천만원', COUNT(*) FILTER (WHERE t6.base_amt >= 10000000 AND t6.base_amt < 50000000)::INT
        FROM public.tenders t6
        WHERE t6.bid_ntce_dt >= v_start AND t6.bid_ntce_dt <= v_end
        UNION ALL
        SELECT 3, '5천만~1억원', COUNT(*) FILTER (WHERE t6.base_amt >= 50000000 AND t6.base_amt < 100000000)::INT
        FROM public.tenders t6
        WHERE t6.bid_ntce_dt >= v_start AND t6.bid_ntce_dt <= v_end
        UNION ALL
        SELECT 4, '1억원 이상', COUNT(*) FILTER (WHERE t6.base_amt >= 100000000)::INT
        FROM public.tenders t6
        WHERE t6.bid_ntce_dt >= v_start AND t6.bid_ntce_dt <= v_end
        UNION ALL
        SELECT 5, '금액 미기재', COUNT(*) FILTER (WHERE t6.base_amt IS NULL OR t6.base_amt <= 0)::INT
        FROM public.tenders t6
        WHERE t6.bid_ntce_dt >= v_start AND t6.bid_ntce_dt <= v_end
      ) b
    ), '[]'::jsonb) AS budget_band_breakdown,
    NOW() AS refreshed_at
  FROM public.tenders t
  WHERE t.bid_ntce_dt >= v_start AND t.bid_ntce_dt <= v_end
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

-- 6) 3~6개월 이후 raw 아카이브용 테이블 + 함수
CREATE TABLE IF NOT EXISTS public.tenders_archive (
  LIKE public.tenders INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

ALTER TABLE public.tenders_archive
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.archive_old_tenders(p_older_than_months INT DEFAULT 6)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_cutoff := NOW() - make_interval(months => p_older_than_months);

  WITH moved AS (
    INSERT INTO public.tenders_archive
    SELECT t.*, NOW() AS archived_at
    FROM public.tenders t
    WHERE t.bid_clse_dt IS NOT NULL
      AND t.bid_clse_dt < v_cutoff
    ON CONFLICT (bid_ntce_no, bid_ntce_ord) DO NOTHING
    RETURNING id
  )
  DELETE FROM public.tenders t
  WHERE t.id IN (SELECT id FROM moved);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

