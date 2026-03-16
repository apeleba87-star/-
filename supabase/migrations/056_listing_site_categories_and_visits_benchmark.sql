-- 현장거래 전용 카테고리(현장 유형) + 평균 매매가 집계에 주 회수 포함

-- 1. categories에 usage 컬럼: 'default' = 기존 대분류/카테고리, 'listing' = 현장 유형
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS usage TEXT NOT NULL DEFAULT 'default'
  CHECK (usage IN ('default', 'listing'));

COMMENT ON COLUMN public.categories.usage IS 'default: 입찰/견적/구인 등. listing: 현장거래 전용 현장 유형(병원/사무실/카페 등)';

UPDATE public.categories SET usage = 'default' WHERE usage IS NULL OR usage <> 'listing';

-- 2. 현장 유형 카테고리 시드 (parent_id NULL, usage = 'listing')
INSERT INTO public.categories (id, name, parent_id, slug, sort_order, is_active, updated_at, usage)
VALUES
  (gen_random_uuid(), '병원 청소', NULL, 'site_hospital', 1, true, NOW(), 'listing'),
  (gen_random_uuid(), '사무실 청소', NULL, 'site_office', 2, true, NOW(), 'listing'),
  (gen_random_uuid(), '카페 청소', NULL, 'site_cafe', 3, true, NOW(), 'listing'),
  (gen_random_uuid(), '계단 청소', NULL, 'site_stairs', 4, true, NOW(), 'listing'),
  (gen_random_uuid(), '학원 청소', NULL, 'site_academy', 5, true, NOW(), 'listing'),
  (gen_random_uuid(), '식당 청소', NULL, 'site_restaurant', 6, true, NOW(), 'listing'),
  (gen_random_uuid(), '매장 청소', NULL, 'site_store', 7, true, NOW(), 'listing')
ON CONFLICT (slug) DO NOTHING;

-- 3. listing_benchmarks에 주 회수(visits_per_week) 메트릭 추가
ALTER TABLE public.listing_benchmarks DROP CONSTRAINT IF EXISTS listing_benchmarks_metric_type_check;
ALTER TABLE public.listing_benchmarks ADD CONSTRAINT listing_benchmarks_metric_type_check
  CHECK (metric_type IN ('fee', 'monthly', 'deal', 'multiplier', 'visits_per_week'));

-- 4. refresh_listing_benchmarks에 visits_per_week 집계 추가 (sale_regular, subcontract)
CREATE OR REPLACE FUNCTION public.refresh_listing_benchmarks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- referral_regular: 소개비 -> 'fee'
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

  -- sale_regular: 배수 -> 'multiplier'
  INSERT INTO listing_benchmarks (
    region, listing_type, category_main_id, category_sub_id, category_main_key, category_sub_key, metric_type, data_source,
    sample_count, avg_value, median_value, min_value, max_value, updated_at
  )
  SELECT region, listing_type, category_main_id, category_sub_id,
    COALESCE(category_main_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'multiplier'::TEXT, 'registered'::TEXT,
    cnt, avg_val, median_val, min_val, max_val, NOW()
  FROM (
    SELECT region, listing_type, category_main_id, category_sub_id,
      count(*)::INT AS cnt,
      avg(val) AS avg_val,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS median_val,
      min(val) AS min_val,
      max(val) AS max_val
    FROM (
      SELECT l.region, l.listing_type, l.category_main_id, l.category_sub_id,
        COALESCE(l.sale_multiplier, l.deal_amount / NULLIF(l.monthly_amount, 0))::NUMERIC AS val,
        row_number() OVER (PARTITION BY l.region, l.listing_type, l.category_main_id, l.category_sub_id ORDER BY l.created_at DESC) AS rn
      FROM listings l
      WHERE l.listing_type = 'sale_regular'
        AND l.status = 'open'
        AND l.category_main_id IS NOT NULL
        AND l.monthly_amount IS NOT NULL
        AND l.monthly_amount > 0
        AND l.monthly_amount < 1000000000
        AND (
          l.sale_multiplier IS NOT NULL
          OR (l.deal_amount IS NOT NULL AND l.deal_amount > 0)
        )
        AND (
          l.sale_multiplier IS NULL
          OR (l.sale_multiplier > 0 AND l.sale_multiplier <= 100)
        )
    ) t
    WHERE rn <= 80
      AND val IS NOT NULL
      AND val > 0
      AND val <= 100
    GROUP BY region, listing_type, category_main_id, category_sub_id
    HAVING count(*) >= 30
  ) sub
  ON CONFLICT (region, listing_type, category_main_key, category_sub_key, metric_type, data_source)
  DO UPDATE SET sample_count = EXCLUDED.sample_count, avg_value = EXCLUDED.avg_value, median_value = EXCLUDED.median_value, min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value, updated_at = NOW();

  -- sale_regular + subcontract: 주 회수 -> 'visits_per_week'
  INSERT INTO listing_benchmarks (
    region, listing_type, category_main_id, category_sub_id, category_main_key, category_sub_key, metric_type, data_source,
    sample_count, avg_value, median_value, min_value, max_value, updated_at
  )
  SELECT region, listing_type, category_main_id, category_sub_id,
    COALESCE(category_main_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'visits_per_week'::TEXT, 'registered'::TEXT,
    cnt, avg_val, median_val, min_val, max_val, NOW()
  FROM (
    SELECT region, listing_type, category_main_id, category_sub_id,
      count(*)::INT AS cnt,
      avg(val) AS avg_val,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS median_val,
      min(val) AS min_val,
      max(val) AS max_val
    FROM (
      SELECT l.region, l.listing_type, l.category_main_id, l.category_sub_id, l.visits_per_week::NUMERIC AS val,
        row_number() OVER (PARTITION BY l.region, l.listing_type, l.category_main_id, l.category_sub_id ORDER BY l.created_at DESC) AS rn
      FROM listings l
      WHERE l.listing_type IN ('sale_regular', 'subcontract')
        AND l.status = 'open'
        AND l.category_main_id IS NOT NULL
        AND l.visits_per_week IS NOT NULL
        AND l.visits_per_week >= 1
        AND l.visits_per_week <= 7
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
