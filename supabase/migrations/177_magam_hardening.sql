-- 마감링크: 정지·재오픈·신고·공개 뷰 프라이버시

-- 1) 마감 후 재오픈 차단 (서비스 롤·SQL은 트리거 우회 없이 — 운영자는 별도 마이그레이션/대시보드)
CREATE OR REPLACE FUNCTION public.magam_listings_prevent_reopen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'closed' AND NEW.status = 'open' THEN
    RAISE EXCEPTION 'magam_listing_cannot_reopen' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_magam_listings_prevent_reopen ON public.magam_listings;
CREATE TRIGGER trg_magam_listings_prevent_reopen
  BEFORE UPDATE ON public.magam_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.magam_listings_prevent_reopen();

-- 2) share_slug 변경 방지
CREATE OR REPLACE FUNCTION public.magam_listings_immutable_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.share_slug IS DISTINCT FROM NEW.share_slug THEN
    RAISE EXCEPTION 'magam_share_slug_immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_magam_listings_immutable_slug ON public.magam_listings;
CREATE TRIGGER trg_magam_listings_immutable_slug
  BEFORE UPDATE ON public.magam_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.magam_listings_immutable_slug();

-- 3) RLS: 정지 사용자 글쓰기 차단
DROP POLICY IF EXISTS "magam_listings_insert_own" ON public.magam_listings;
CREATE POLICY "magam_listings_insert_own" ON public.magam_listings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.magam_suspended_at IS NOT NULL
    )
  );

-- 4) RLS: 정지 사용자 수정 차단
DROP POLICY IF EXISTS "magam_listings_update_own" ON public.magam_listings;
CREATE POLICY "magam_listings_update_own" ON public.magam_listings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.magam_suspended_at IS NOT NULL
    )
  )
  WITH CHECK (auth.uid() = user_id);

-- 5) 신고: anon 직접 INSERT 차단 (API는 service role 사용)
REVOKE INSERT ON public.magam_listing_reports FROM anon;

DROP POLICY IF EXISTS "magam_listing_reports_insert" ON public.magam_listing_reports;
CREATE POLICY "magam_listing_reports_insert" ON public.magam_listing_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = reporter_id);

-- 6) 공개 뷰에서 user_id 제거
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

COMMENT ON VIEW public.magam_listings_public IS '공개 공유·목록용 — closed 연락처 마스킹, user_id 비공개';

GRANT SELECT ON public.magam_listings_public TO anon, authenticated;
