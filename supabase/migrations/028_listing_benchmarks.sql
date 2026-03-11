-- 현장거래 참고값 집계: 표본 30~80건, 중앙값·평균·min·max
-- data_source = 'registered' (등록 기준). 추후 성사/완료 시 'completed' 확장 가능.

CREATE TABLE IF NOT EXISTS public.listing_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('referral_regular', 'sale_regular', 'subcontract')),
  category_main_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_sub_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_main_key UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  category_sub_key UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  metric_type TEXT NOT NULL CHECK (metric_type IN ('fee', 'monthly', 'deal')),
  data_source TEXT NOT NULL DEFAULT 'registered' CHECK (data_source IN ('registered', 'completed')),
  sample_count INT NOT NULL,
  avg_value NUMERIC,
  median_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region, listing_type, category_main_key, category_sub_key, metric_type, data_source)
);

CREATE INDEX IF NOT EXISTS idx_listing_benchmarks_lookup
  ON listing_benchmarks(region, listing_type, category_main_id, metric_type);

ALTER TABLE public.listing_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_benchmarks_read" ON listing_benchmarks FOR SELECT USING (true);

-- 집계: 표본 30건 이상만 반영, 최대 80건으로 평균·중앙값 계산. 0 이하·비합리적 상한 제외.
CREATE OR REPLACE FUNCTION public.refresh_listing_benchmarks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- referral_regular: 소개비(pay_amount) -> metric_type 'fee'
  INSERT INTO listing_benchmarks (
    region, listing_type, category_main_id, category_sub_id, category_main_key, category_sub_key, metric_type, data_source,
    sample_count, avg_value, median_value, min_value, max_value, updated_at
  )
  SELECT
    region, listing_type, category_main_id, category_sub_id,
    COALESCE(category_main_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'fee'::TEXT, 'registered'::TEXT,
    cnt, avg_val, median_val, min_val, max_val, NOW()
  FROM (
    SELECT
      region, listing_type, category_main_id, category_sub_id,
      count(*)::INT AS cnt,
      avg(val) AS avg_val,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS median_val,
      min(val) AS min_val,
      max(val) AS max_val
    FROM (
      SELECT l.region, l.listing_type, l.category_main_id, l.category_sub_id, l.pay_amount AS val,
        row_number() OVER (PARTITION BY l.region, l.listing_type, l.category_main_id, l.category_sub_id ORDER BY l.created_at DESC) AS rn
      FROM listings l
      WHERE l.listing_type = 'referral_regular'
        AND l.status = 'open'
        AND l.category_main_id IS NOT NULL
        AND l.pay_amount IS NOT NULL
        AND l.pay_amount > 0
        AND l.pay_amount < 100000000
    ) t
    WHERE rn <= 80
    GROUP BY region, listing_type, category_main_id, category_sub_id
    HAVING count(*) >= 30
  ) sub
  ON CONFLICT (region, listing_type, category_main_key, category_sub_key, metric_type, data_source)
  DO UPDATE SET
    sample_count = EXCLUDED.sample_count,
    avg_value = EXCLUDED.avg_value,
    median_value = EXCLUDED.median_value,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    updated_at = NOW();

  -- sale_regular: monthly_amount -> 'monthly'
  INSERT INTO listing_benchmarks (
    region, listing_type, category_main_id, category_sub_id, category_main_key, category_sub_key, metric_type, data_source,
    sample_count, avg_value, median_value, min_value, max_value, updated_at
  )
  SELECT region, listing_type, category_main_id, category_sub_id,
    COALESCE(category_main_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'monthly'::TEXT, 'registered'::TEXT,
    cnt, avg_val, median_val, min_val, max_val, NOW()
  FROM (
    SELECT region, listing_type, category_main_id, category_sub_id,
      count(*)::INT AS cnt,
      avg(val) AS avg_val,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS median_val,
      min(val) AS min_val,
      max(val) AS max_val
    FROM (
      SELECT l.region, l.listing_type, l.category_main_id, l.category_sub_id, l.monthly_amount AS val,
        row_number() OVER (PARTITION BY l.region, l.listing_type, l.category_main_id, l.category_sub_id ORDER BY l.created_at DESC) AS rn
      FROM listings l
      WHERE l.listing_type = 'sale_regular'
        AND l.status = 'open'
        AND l.category_main_id IS NOT NULL
        AND l.monthly_amount IS NOT NULL
        AND l.monthly_amount > 0
        AND l.monthly_amount < 1000000000
    ) t
    WHERE rn <= 80
    GROUP BY region, listing_type, category_main_id, category_sub_id
    HAVING count(*) >= 30
  ) sub
  ON CONFLICT (region, listing_type, category_main_key, category_sub_key, metric_type, data_source)
  DO UPDATE SET sample_count = EXCLUDED.sample_count, avg_value = EXCLUDED.avg_value, median_value = EXCLUDED.median_value, min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value, updated_at = NOW();

  -- sale_regular: deal_amount -> 'deal'
  INSERT INTO listing_benchmarks (
    region, listing_type, category_main_id, category_sub_id, category_main_key, category_sub_key, metric_type, data_source,
    sample_count, avg_value, median_value, min_value, max_value, updated_at
  )
  SELECT region, listing_type, category_main_id, category_sub_id,
    COALESCE(category_main_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'deal'::TEXT, 'registered'::TEXT,
    cnt, avg_val, median_val, min_val, max_val, NOW()
  FROM (
    SELECT region, listing_type, category_main_id, category_sub_id,
      count(*)::INT AS cnt,
      avg(val) AS avg_val,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS median_val,
      min(val) AS min_val,
      max(val) AS max_val
    FROM (
      SELECT l.region, l.listing_type, l.category_main_id, l.category_sub_id, l.deal_amount AS val,
        row_number() OVER (PARTITION BY l.region, l.listing_type, l.category_main_id, l.category_sub_id ORDER BY l.created_at DESC) AS rn
      FROM listings l
      WHERE l.listing_type = 'sale_regular'
        AND l.status = 'open'
        AND l.category_main_id IS NOT NULL
        AND l.deal_amount IS NOT NULL
        AND l.deal_amount > 0
        AND l.deal_amount < 1000000000
    ) t
    WHERE rn <= 80
    GROUP BY region, listing_type, category_main_id, category_sub_id
    HAVING count(*) >= 30
  ) sub
  ON CONFLICT (region, listing_type, category_main_key, category_sub_key, metric_type, data_source)
  DO UPDATE SET sample_count = EXCLUDED.sample_count, avg_value = EXCLUDED.avg_value, median_value = EXCLUDED.median_value, min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value, updated_at = NOW();

  -- subcontract: monthly_amount -> 'monthly'
  INSERT INTO listing_benchmarks (
    region, listing_type, category_main_id, category_sub_id, category_main_key, category_sub_key, metric_type, data_source,
    sample_count, avg_value, median_value, min_value, max_value, updated_at
  )
  SELECT region, listing_type, category_main_id, category_sub_id,
    COALESCE(category_main_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'monthly'::TEXT, 'registered'::TEXT,
    cnt, avg_val, median_val, min_val, max_val, NOW()
  FROM (
    SELECT region, listing_type, category_main_id, category_sub_id,
      count(*)::INT AS cnt,
      avg(val) AS avg_val,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS median_val,
      min(val) AS min_val,
      max(val) AS max_val
    FROM (
      SELECT l.region, l.listing_type, l.category_main_id, l.category_sub_id, l.monthly_amount AS val,
        row_number() OVER (PARTITION BY l.region, l.listing_type, l.category_main_id, l.category_sub_id ORDER BY l.created_at DESC) AS rn
      FROM listings l
      WHERE l.listing_type = 'subcontract'
        AND l.status = 'open'
        AND l.category_main_id IS NOT NULL
        AND l.monthly_amount IS NOT NULL
        AND l.monthly_amount > 0
        AND l.monthly_amount < 1000000000
    ) t
    WHERE rn <= 80
    GROUP BY region, listing_type, category_main_id, category_sub_id
    HAVING count(*) >= 30
  ) sub
  ON CONFLICT (region, listing_type, category_main_key, category_sub_key, metric_type, data_source)
  DO UPDATE SET sample_count = EXCLUDED.sample_count, avg_value = EXCLUDED.avg_value, median_value = EXCLUDED.median_value, min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value, updated_at = NOW();
END;
$$;
