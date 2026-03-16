-- Ensure estimate_check_required exists (re-run safe if 035 was skipped)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS estimate_check_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.estimate_check_required IS '소개 현장: 견적/현장 확인 필요 여부';
