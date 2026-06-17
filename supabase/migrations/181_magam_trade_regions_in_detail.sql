-- 매매: 여러 지역 → 상세 설명 참조 체크

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS trade_regions_in_detail BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.magam_listings.trade_regions_in_detail IS
  '매매 — 활동 지역이 여러 곳이면 true, 상세 설명 참조';

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
  price_negotiable,
  trade_regions_in_detail
FROM public.magam_listings;

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
