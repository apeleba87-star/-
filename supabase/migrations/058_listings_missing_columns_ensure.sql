-- Ensure all columns used by 현장 거래 등록 exist (fix schema cache errors when older migrations were skipped)
-- 012: 일정(작업 예정일)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS work_date DATE;
CREATE INDEX IF NOT EXISTS idx_listings_work_date ON public.listings(work_date);

-- 029: 소개 예상금액·수수료율
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS expected_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_rate_percent NUMERIC;

-- fee_rate_percent constraint (029) - add only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_fee_rate_range' AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_fee_rate_range
      CHECK (fee_rate_percent IS NULL OR (fee_rate_percent >= 0 AND fee_rate_percent <= 100));
  END IF;
END $$;

-- 035/057: 견적 확인 필요
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS estimate_check_required BOOLEAN NOT NULL DEFAULT false;

-- 027: 월수금·매매가·평수·주회수·난이도 (일부 환경에서 누락 시 대비)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deal_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC,
  ADD COLUMN IF NOT EXISTS visits_per_week INT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- 030: 배수
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sale_multiplier NUMERIC;

-- 036: 계단 청소
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS stairs_floors INT,
  ADD COLUMN IF NOT EXISTS stairs_restroom_count INT,
  ADD COLUMN IF NOT EXISTS stairs_has_recycle BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_has_corridor BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_elevator BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_parking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_window BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.expected_amount IS '소개: 성사 예상 금액. 금액 미정이면 NULL.';
COMMENT ON COLUMN public.listings.fee_rate_percent IS '소개: 소개비 수수료율 0~100.';
COMMENT ON COLUMN public.listings.estimate_check_required IS '소개 현장: 견적/현장 확인 필요 여부';
