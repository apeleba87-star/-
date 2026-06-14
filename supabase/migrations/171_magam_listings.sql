-- 마감 앱 공고 (도급/구인/매매) — Flutter 작성 + 웹 공유 + 클린아이덱스 실시간 모집

CREATE TABLE IF NOT EXISTS public.magam_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('subcontract', 'hiring', 'trade')),
  region_gu TEXT NOT NULL,
  body_text TEXT NOT NULL CHECK (char_length(trim(body_text)) >= 4),
  contact_phone TEXT NOT NULL CHECK (char_length(trim(contact_phone)) >= 9),
  price_text TEXT,
  schedule_text TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  share_slug TEXT NOT NULL UNIQUE,
  linked_service_disclosed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.magam_listings IS '마감 앱 공고 — open만 연락처 공개(공개 view), closed는 마감 처리';
COMMENT ON COLUMN public.magam_listings.linked_service_disclosed IS '연동 모집 안내 서비스 노출 동의(첫 글)';

CREATE INDEX IF NOT EXISTS idx_magam_listings_user_created
  ON public.magam_listings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magam_listings_status_created
  ON public.magam_listings (status, created_at DESC)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_magam_listings_region_open
  ON public.magam_listings (region_gu, created_at DESC)
  WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS idx_magam_listings_share_slug
  ON public.magam_listings (share_slug);

CREATE OR REPLACE FUNCTION public.magam_listings_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.share_slug IS NULL OR trim(NEW.share_slug) = '' THEN
    NEW.share_slug := encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_magam_listings_set_slug ON public.magam_listings;
CREATE TRIGGER trg_magam_listings_set_slug
  BEFORE INSERT ON public.magam_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.magam_listings_set_slug();

CREATE OR REPLACE FUNCTION public.magam_listings_touch_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, NOW());
  ELSIF NEW.status = 'open' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_magam_listings_touch_updated ON public.magam_listings;
CREATE TRIGGER trg_magam_listings_touch_updated
  BEFORE UPDATE ON public.magam_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.magam_listings_touch_updated();

-- 공개 조회: 마감 시 연락처 NULL (view owner 권한 — anon도 closed 행 조회 가능)
CREATE OR REPLACE VIEW public.magam_listings_public
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
  closed_at
FROM public.magam_listings;

COMMENT ON VIEW public.magam_listings_public IS '공개 공유·목록용 — closed 연락처 마스킹';

ALTER TABLE public.magam_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magam_listings_select_own" ON public.magam_listings;
CREATE POLICY "magam_listings_select_own" ON public.magam_listings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "magam_listings_select_open_public" ON public.magam_listings;
-- (removed — 공개 읽기는 magam_listings_public view만 사용)

DROP POLICY IF EXISTS "magam_listings_insert_own" ON public.magam_listings;
CREATE POLICY "magam_listings_insert_own" ON public.magam_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'open');

DROP POLICY IF EXISTS "magam_listings_update_own" ON public.magam_listings;
CREATE POLICY "magam_listings_update_own" ON public.magam_listings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "magam_listings_delete_own" ON public.magam_listings;
CREATE POLICY "magam_listings_delete_own" ON public.magam_listings
  FOR DELETE USING (auth.uid() = user_id);

REVOKE ALL ON public.magam_listings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magam_listings TO authenticated;
GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
