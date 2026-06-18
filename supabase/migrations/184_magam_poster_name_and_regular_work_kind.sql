-- 마감 앱: 공고별 작성자/업체명 및 정기청소 대상 제약 보정

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS poster_name TEXT;

COMMENT ON COLUMN public.magam_listings.poster_name IS
  '공고에 노출되는 작성자/업체명. 공고별 저장';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS magam_display_name TEXT,
  ADD COLUMN IF NOT EXISTS magam_display_name_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.magam_display_name IS
  '마감 앱 공고에 노출되는 기본 업체명/닉네임. 일반 사용자는 30일에 1회 변경';
COMMENT ON COLUMN public.profiles.magam_display_name_updated_at IS
  '마감 앱 기본 업체명/닉네임 마지막 변경 시각';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_magam_display_name_unique
  ON public.profiles (LOWER(TRIM(magam_display_name)))
  WHERE magam_display_name IS NOT NULL AND TRIM(magam_display_name) <> '';

CREATE OR REPLACE FUNCTION public.check_magam_display_name_available(name_input TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(TRIM(magam_display_name)) = LOWER(TRIM(name_input))
      AND magam_display_name IS NOT NULL
      AND TRIM(magam_display_name) <> ''
      AND id <> auth.uid()
  );
$$;

COMMENT ON FUNCTION public.check_magam_display_name_available(TEXT) IS
  '마감 앱 업체명(닉네임) 중복 확인. 현재 로그인 사용자의 기존 닉네임은 허용';

ALTER TABLE public.magam_listings
  DROP CONSTRAINT IF EXISTS magam_listings_work_kind_check;

ALTER TABLE public.magam_listings
  ADD CONSTRAINT magam_listings_work_kind_check
  CHECK (
    work_kind IS NULL OR work_kind IN (
      'move_in_new',
      'move_out',
      'ac',
      'other',
      'office',
      'store',
      'clinic_academy',
      'villa_common',
      'factory_warehouse'
    )
  );

DROP VIEW IF EXISTS public.magam_listings_public;

CREATE VIEW public.magam_listings_public
WITH (security_invoker = false)
AS
SELECT
  id,
  listing_type,
  region_gu,
  body_text,
  CASE WHEN status = 'open' THEN contact_phone ELSE NULL END AS contact_phone,
  poster_name,
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
