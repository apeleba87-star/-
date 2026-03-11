-- sale_regular 배수 참고값 집계: sale_multiplier 또는 deal_amount/monthly_amount 역산

CREATE OR REPLACE FUNCTION public.refresh_listing_benchmarks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- (기존 fee, monthly, deal, subcontract 블록은 028과 동일하게 유지)
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

  -- sale_regular: 배수(multiplier) -> deal_amount/monthly_amount 또는 sale_multiplier
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
