-- 협력업체 셀프 수정 요청(썸네일/가격) 승인 워크플로우

CREATE TABLE IF NOT EXISTS public.partner_company_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('profile_update')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payload JSONB NOT NULL,
  reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_change_requests_company_created
  ON public.partner_company_change_requests(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_change_requests_status_created
  ON public.partner_company_change_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_change_requests_requester_created
  ON public.partner_company_change_requests(requester_user_id, created_at DESC);

ALTER TABLE public.partner_company_change_requests ENABLE ROW LEVEL SECURITY;

-- 재실행 안전성
DROP POLICY IF EXISTS "partner_change_requests_admin_all" ON public.partner_company_change_requests;
DROP POLICY IF EXISTS "partner_change_requests_owner_select" ON public.partner_company_change_requests;
DROP POLICY IF EXISTS "partner_change_requests_owner_insert" ON public.partner_company_change_requests;

-- 관리자/에디터 전체 조회/처리
CREATE POLICY "partner_change_requests_admin_all"
  ON public.partner_company_change_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'editor')
    )
  );

-- owner는 본인 업체에 대한 요청 조회 + 생성 가능
CREATE POLICY "partner_change_requests_owner_select"
  ON public.partner_company_change_requests FOR SELECT
  USING (
    requester_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "partner_change_requests_owner_insert"
  ON public.partner_company_change_requests FOR INSERT
  WITH CHECK (
    requester_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.owner_user_id = auth.uid()
    )
  );
