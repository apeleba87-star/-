-- 마감 앱 연동 노출 동의 (프로필 1회) + listing 기본값 보정

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS magam_sync_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS magam_sync_consent_version TEXT;

COMMENT ON COLUMN public.profiles.magam_sync_consent_at IS '마감앱→cleanidex 등 연동 모집 노출 동의 시각(1회, 이후 글에도 적용)';
COMMENT ON COLUMN public.profiles.magam_sync_consent_version IS '동의 문구 버전 (예: 1)';

ALTER TABLE public.magam_listings
  ALTER COLUMN linked_service_disclosed SET DEFAULT FALSE;

COMMENT ON COLUMN public.magam_listings.linked_service_disclosed IS '해당 글 등록 시 연동 노출 동의 여부(프로필 동의 또는 당시 체크)';
