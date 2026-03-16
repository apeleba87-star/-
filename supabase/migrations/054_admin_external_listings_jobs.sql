-- 관리자 외부 퍼온 글: 현장거래·인력구인 플래그 및 거래완료 신고

-- 1. listings: 외부 출처 플래그
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.listings.is_external IS '외부 커뮤니티에서 퍼온 글(관리자 등록). 상세에서 직접 연락·확인 안내 노출';
COMMENT ON COLUMN public.listings.source_url IS '출처 URL (선택). 외부 퍼온 글일 때만';

-- 2. job_posts: 외부 출처 플래그
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.job_posts.is_external IS '외부 커뮤니티에서 퍼온 구인(관리자 등록). 상세에서 직접 연락·확인 안내 노출';
COMMENT ON COLUMN public.job_posts.source_url IS '출처 URL (선택)';

-- 3. listing_incidents: 거래 완료 신고 타입 추가 (사용자 신고 시 해당 글 마감 처리용)
ALTER TABLE public.listing_incidents
  DROP CONSTRAINT IF EXISTS listing_incidents_incident_type_check;

ALTER TABLE public.listing_incidents
  ADD CONSTRAINT listing_incidents_incident_type_check
  CHECK (incident_type IN (
    'no_show', 'non_payment', 'mismatch', 'no_contact', 'other', 'deal_completed'
  ));

COMMENT ON CONSTRAINT listing_incidents_incident_type_check ON public.listing_incidents IS 'deal_completed: 거래 완료 신고 시 listing 마감 처리';
