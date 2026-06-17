-- 매매 필드 단순화 (구 179 초안 적용 환경 대비)

ALTER TABLE public.magam_listings
  DROP COLUMN IF EXISTS trade_revenue_band,
  DROP COLUMN IF EXISTS trade_profit_band,
  DROP COLUMN IF EXISTS trade_client_band,
  DROP COLUMN IF EXISTS trade_staff_count,
  DROP COLUMN IF EXISTS trade_business_years,
  DROP COLUMN IF EXISTS trade_assets,
  DROP COLUMN IF EXISTS trade_work_focus;

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS trade_client_count INT CHECK (
    trade_client_count IS NULL OR (trade_client_count > 0 AND trade_client_count <= 9999)
  ),
  ADD COLUMN IF NOT EXISTS trade_total_revenue BIGINT CHECK (
    trade_total_revenue IS NULL OR trade_total_revenue > 0
  );

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

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
