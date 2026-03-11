-- 소개 현장: 견적 확인 필요 여부 (구매자가 현장 직접 파악 가능한 경우용)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS estimate_check_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.estimate_check_required IS '소개 현장: 견적/현장 확인 필요 여부';
