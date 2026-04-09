-- 협력업체 포트폴리오(이미지) + Storage 버킷 (공개 읽기, 업로드는 admin/editor 또는 해당 owner)

CREATE TABLE IF NOT EXISTS public.partner_company_portfolio_items (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 100,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT,
  image_path_thumb TEXT NOT NULL,
  image_path_display TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_portfolio_company_sort
  ON public.partner_company_portfolio_items(company_id, sort_order);

ALTER TABLE public.partner_company_portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.partner_portfolio_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partner_portfolio_set_updated_at ON public.partner_company_portfolio_items;
CREATE TRIGGER trg_partner_portfolio_set_updated_at
  BEFORE UPDATE ON public.partner_company_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.partner_portfolio_set_updated_at();

CREATE OR REPLACE FUNCTION public.partner_portfolio_enforce_max_items()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)::INT
    FROM public.partner_company_portfolio_items
    WHERE company_id = NEW.company_id
  ) >= 9 THEN
    RAISE EXCEPTION 'Portfolio limited to 9 images per company';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partner_portfolio_max_items ON public.partner_company_portfolio_items;
CREATE TRIGGER trg_partner_portfolio_max_items
  BEFORE INSERT ON public.partner_company_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.partner_portfolio_enforce_max_items();

DROP POLICY IF EXISTS "partner_portfolio_public_select_active" ON public.partner_company_portfolio_items;
DROP POLICY IF EXISTS "partner_portfolio_admin_all" ON public.partner_company_portfolio_items;
DROP POLICY IF EXISTS "partner_portfolio_owner_select" ON public.partner_company_portfolio_items;
DROP POLICY IF EXISTS "partner_portfolio_owner_insert" ON public.partner_company_portfolio_items;
DROP POLICY IF EXISTS "partner_portfolio_owner_update" ON public.partner_company_portfolio_items;
DROP POLICY IF EXISTS "partner_portfolio_owner_delete" ON public.partner_company_portfolio_items;

-- 공개: 활성 업체의 포트폴리오만
CREATE POLICY "partner_portfolio_public_select_active"
  ON public.partner_company_portfolio_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id = company_id AND c.status = 'active'
    )
  );

-- 관리자/에디터 전체
CREATE POLICY "partner_portfolio_admin_all"
  ON public.partner_company_portfolio_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );

-- Owner: 본인 업체 (상태 무관) 조회·추가·수정·삭제
CREATE POLICY "partner_portfolio_owner_select"
  ON public.partner_company_portfolio_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id = company_id AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "partner_portfolio_owner_insert"
  ON public.partner_company_portfolio_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id = company_id AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "partner_portfolio_owner_update"
  ON public.partner_company_portfolio_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id = company_id AND c.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id = company_id AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "partner_portfolio_owner_delete"
  ON public.partner_company_portfolio_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id = company_id AND c.owner_user_id = auth.uid()
    )
  );

-- Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-portfolio', 'partner-portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "partner_portfolio_storage_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "partner_portfolio_storage_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "partner_portfolio_storage_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "partner_portfolio_storage_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "partner_portfolio_storage_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "partner_portfolio_storage_owner_delete" ON storage.objects;

CREATE POLICY "partner_portfolio_storage_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "partner_portfolio_storage_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'partner-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "partner_portfolio_storage_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "partner_portfolio_storage_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id::text = split_part(name, '/', 1)
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "partner_portfolio_storage_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'partner-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id::text = split_part(name, '/', 1)
        AND c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "partner_portfolio_storage_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-portfolio'
    AND EXISTS (
      SELECT 1 FROM public.partner_companies c
      WHERE c.id::text = split_part(name, '/', 1)
        AND c.owner_user_id = auth.uid()
    )
  );
