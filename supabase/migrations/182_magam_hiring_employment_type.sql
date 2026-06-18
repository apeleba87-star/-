-- 마감 앱 구인: 일당/정규직 구분

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS hiring_employment_type TEXT CHECK (
    hiring_employment_type IS NULL OR hiring_employment_type IN ('daily', 'full_time')
  );

COMMENT ON COLUMN public.magam_listings.hiring_employment_type IS
  '구인 — daily 일당, full_time 정규직';

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
  hiring_employment_type
FROM public.magam_listings;

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
