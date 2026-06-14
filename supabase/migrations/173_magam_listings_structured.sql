-- 마감 앱 정형 필드 (일정·지역·작업·금액) + 프로필 연락처

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS magam_contact_phone TEXT;

COMMENT ON COLUMN public.profiles.magam_contact_phone IS '마감 앱 기본 연락처(글쓰기 자동 채움)';

ALTER TABLE public.magam_listings
  ADD COLUMN IF NOT EXISTS schedule_date DATE,
  ADD COLUMN IF NOT EXISTS time_slot TEXT CHECK (
    time_slot IS NULL OR time_slot IN ('morning', 'afternoon', 'same_day', 'flexible')
  ),
  ADD COLUMN IF NOT EXISTS city_id TEXT,
  ADD COLUMN IF NOT EXISTS district_slug TEXT,
  ADD COLUMN IF NOT EXISTS work_kind TEXT CHECK (
    work_kind IS NULL OR work_kind IN ('move_in_new', 'move_out', 'ac', 'other')
  ),
  ADD COLUMN IF NOT EXISTS pyeong INT CHECK (pyeong IS NULL OR (pyeong > 0 AND pyeong <= 999)),
  ADD COLUMN IF NOT EXISTS ac_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_amount BIGINT CHECK (price_amount IS NULL OR price_amount >= 0),
  ADD COLUMN IF NOT EXISTS price_unit TEXT CHECK (price_unit IS NULL OR price_unit IN ('man', 'jan'));

ALTER TABLE public.magam_listings DROP CONSTRAINT IF EXISTS magam_listings_listing_type_check;
ALTER TABLE public.magam_listings
  ADD CONSTRAINT magam_listings_listing_type_check
  CHECK (listing_type IN ('subcontract', 'hiring'));

CREATE INDEX IF NOT EXISTS idx_magam_listings_schedule_open
  ON public.magam_listings (schedule_date, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_magam_listings_city_district_open
  ON public.magam_listings (city_id, district_slug, created_at DESC)
  WHERE status = 'open';

-- CREATE OR REPLACE는 기존 컬럼 순서 중간에 열을 추가할 수 없음 → DROP 후 재생성
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
  price_unit
FROM public.magam_listings;

COMMENT ON VIEW public.magam_listings_public IS '공개 공유·목록용 — closed 연락처 마스킹';

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
