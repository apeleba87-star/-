-- 마감 앱 매매(양도·양수) — trade 타입 + 거래처 수·총 매출·희망 판매가

ALTER TABLE public.magam_listings DROP CONSTRAINT IF EXISTS magam_listings_listing_type_check;
ALTER TABLE public.magam_listings
  ADD CONSTRAINT magam_listings_listing_type_check
  CHECK (listing_type IN ('subcontract', 'hiring', 'trade'));

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS trade_side TEXT CHECK (
    trade_side IS NULL OR trade_side IN ('sell', 'buy')
  ),
  ADD COLUMN IF NOT EXISTS trade_client_count INT CHECK (
    trade_client_count IS NULL OR (trade_client_count > 0 AND trade_client_count <= 9999)
  ),
  ADD COLUMN IF NOT EXISTS trade_total_revenue BIGINT CHECK (
    trade_total_revenue IS NULL OR trade_total_revenue > 0
  ),
  ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.magam_listings.trade_side IS '매매 — sell 양도(팝니다), buy 양수(삽니다)';
COMMENT ON COLUMN public.magam_listings.trade_client_count IS '매매 — 거래처 수';
COMMENT ON COLUMN public.magam_listings.trade_total_revenue IS '매매 — 총 매출(원, 만원×10000)';
COMMENT ON COLUMN public.magam_listings.price_negotiable IS '매매 — 희망 판매가 협의';

CREATE INDEX IF NOT EXISTS idx_magam_listings_trade_open
  ON public.magam_listings (listing_type, created_at DESC)
  WHERE status = 'open' AND listing_type = 'trade';

DROP VIEW IF EXISTS public.magam_listings_public;

CREATE VIEW public.magam_listings_public
WITH (security_invoker = false)
AS
SELECT
  id,
  user_id,
  listing_type,
  region_gu,
  body_text,
  CASE WHEN status = 'open' THEN contact_phone ELSE NULL END AS contact_phone,
  price_text,
  schedule_text,
  status,
  share_slug,
  created_at,
  updated_at,
  closed_at,
  schedule_date,
  time_slot,
  city_id,
  district_slug,
  work_kind,
  pyeong,
  ac_types,
  price_amount,
  price_unit,
  special_notes,
  trade_side,
  trade_client_count,
  trade_total_revenue,
  price_negotiable
FROM public.magam_listings;

COMMENT ON VIEW public.magam_listings_public IS '공개 공유·목록용 — closed 연락처 마스킹';

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
