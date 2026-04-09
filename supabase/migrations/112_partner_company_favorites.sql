-- 협력업체 "관심 업체" (로그인 사용자). 업체별 COUNT로 관심도/광고 지표 보조 지표로 활용 가능.

CREATE TABLE IF NOT EXISTS public.partner_company_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_favorites_company_created
  ON public.partner_company_favorites(company_id, created_at DESC);

ALTER TABLE public.partner_company_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_favorites_user_select" ON public.partner_company_favorites;
DROP POLICY IF EXISTS "partner_favorites_user_insert" ON public.partner_company_favorites;
DROP POLICY IF EXISTS "partner_favorites_user_delete" ON public.partner_company_favorites;
DROP POLICY IF EXISTS "partner_favorites_admin_select" ON public.partner_company_favorites;

CREATE POLICY "partner_favorites_user_select"
  ON public.partner_company_favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "partner_favorites_user_insert"
  ON public.partner_company_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "partner_favorites_user_delete"
  ON public.partner_company_favorites FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "partner_favorites_admin_select"
  ON public.partner_company_favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );
