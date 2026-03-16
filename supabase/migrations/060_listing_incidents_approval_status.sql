-- 거래 완료 신고: 관리자 확인 후 마감 (approval_status)
-- deal_completed 타입만 사용. pending → 관리자 승인 시 approved + listing 마감, 거절 시 rejected
ALTER TABLE public.listing_incidents
  ADD COLUMN IF NOT EXISTS approval_status TEXT;

ALTER TABLE public.listing_incidents
  DROP CONSTRAINT IF EXISTS listing_incidents_approval_status_check;

ALTER TABLE public.listing_incidents
  ADD CONSTRAINT listing_incidents_approval_status_check
  CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected'));

COMMENT ON COLUMN public.listing_incidents.approval_status IS 'deal_completed 전용: pending(대기), approved(승인·마감), rejected(거절)';
