-- 마감 앱 공고 특이사항 (선택)

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS special_notes TEXT;

COMMENT ON COLUMN public.magam_listings.special_notes IS '특이사항 — 선택 입력';

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
  special_notes
FROM public.magam_listings;

COMMENT ON VIEW public.magam_listings_public IS '공개 공유·목록용 — closed 연락처 마스킹';

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
