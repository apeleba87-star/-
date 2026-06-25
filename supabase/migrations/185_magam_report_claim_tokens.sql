-- 마감링크: 비로그인 신고를 로그인 계정에 연결하기 위한 claim token

ALTER TABLE public.magam_listing_reports
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_magam_listing_reports_claim_token
  ON public.magam_listing_reports (claim_token)
  WHERE claim_token IS NOT NULL;

COMMENT ON COLUMN public.magam_listing_reports.claim_token IS
  '비로그인 신고 후 로그인 계정 연결용 임시 토큰';
COMMENT ON COLUMN public.magam_listing_reports.claimed_at IS
  '비로그인 신고가 로그인 계정에 연결된 시각';
