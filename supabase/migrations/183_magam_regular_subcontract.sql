-- 마감 앱 도급: 정기청소 도급 구분

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS subcontract_kind TEXT CHECK (
    subcontract_kind IS NULL OR subcontract_kind IN ('one_time', 'regular')
  ),
  ADD COLUMN IF NOT EXISTS regular_frequency_count INTEGER CHECK (
    regular_frequency_count IS NULL OR regular_frequency_count > 0
  ),
  ADD COLUMN IF NOT EXISTS regular_frequency_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS regular_area_in_detail BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.magam_listings.subcontract_kind IS
  '도급 — one_time 1회성, regular 정기청소';
COMMENT ON COLUMN public.magam_listings.regular_frequency_count IS
  '정기청소 도급 — 주 N회';
COMMENT ON COLUMN public.magam_listings.regular_frequency_negotiable IS
  '정기청소 도급 — 주기 협의';
COMMENT ON COLUMN public.magam_listings.regular_area_in_detail IS
  '정기청소 도급 — 면적 상세 설명 참조';

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
  trade_regions_in_detail,
  hiring_employment_type,
  subcontract_kind,
  regular_frequency_count,
  regular_frequency_negotiable,
  regular_area_in_detail
FROM public.magam_listings;

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
