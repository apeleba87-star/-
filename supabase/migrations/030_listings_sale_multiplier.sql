-- 정기 매매: 배수 직접 입력 또는 월수금·매매가로 역산 저장

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sale_multiplier NUMERIC CHECK (sale_multiplier IS NULL OR (sale_multiplier > 0 AND sale_multiplier <= 100));

COMMENT ON COLUMN public.listings.sale_multiplier IS '정기 매매: 배수(매매가/월수금). 직접 입력하거나 월수금·매매가로 역산.';

-- listing_benchmarks에 multiplier 메트릭 지원
ALTER TABLE public.listing_benchmarks DROP CONSTRAINT IF EXISTS listing_benchmarks_metric_type_check;
ALTER TABLE public.listing_benchmarks ADD CONSTRAINT listing_benchmarks_metric_type_check
  CHECK (metric_type IN ('fee', 'monthly', 'deal', 'multiplier'));
