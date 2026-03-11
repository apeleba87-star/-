-- 소개: 예상금액·수수료율 저장 / 일회성 매매(sale_one_time) 유형 추가

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS expected_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_rate_percent NUMERIC;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_fee_rate_range;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_fee_rate_range
  CHECK (fee_rate_percent IS NULL OR (fee_rate_percent >= 0 AND fee_rate_percent <= 100));

COMMENT ON COLUMN public.listings.expected_amount IS '소개: 성사 예상 금액. 금액 미정이면 NULL.';
COMMENT ON COLUMN public.listings.fee_rate_percent IS '소개: 소개비 수수료율 0~100.';

-- listing_type에 sale_one_time 추가 (일회성 매매)
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN (
    'sale_regular', 'sale_one_time', 'referral_regular', 'referral_one_time', 'job_posting', 'subcontract'
  ));
