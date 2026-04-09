-- 협력 센터 MVP: 업체/업종/지역/가격/배지/문의 이벤트

CREATE TABLE IF NOT EXISTS public.partner_categories (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_regions (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_code TEXT REFERENCES public.partner_regions(code) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_badges (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  one_liner TEXT,
  work_scope TEXT,
  business_verified BOOLEAN NOT NULL DEFAULT FALSE,
  homepage_url TEXT,
  sns_url TEXT,
  main_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived')),
  is_paid_slot BOOLEAN NOT NULL DEFAULT FALSE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_company_categories (
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL REFERENCES public.partner_categories(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, category_code)
);

CREATE TABLE IF NOT EXISTS public.partner_company_regions (
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  region_code TEXT NOT NULL REFERENCES public.partner_regions(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, region_code)
);

CREATE TABLE IF NOT EXISTS public.partner_company_badges (
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.partner_badges(code) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  PRIMARY KEY (company_id, badge_code)
);

CREATE TABLE IF NOT EXISTS public.partner_company_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  unit TEXT,
  base_price NUMERIC(12, 0) NOT NULL CHECK (base_price >= 0),
  note TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('detail_view', 'contact_click')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_companies_status_created
  ON public.partner_companies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_company_categories_code
  ON public.partner_company_categories(category_code, company_id);
CREATE INDEX IF NOT EXISTS idx_partner_company_regions_code
  ON public.partner_company_regions(region_code, company_id);
CREATE INDEX IF NOT EXISTS idx_partner_contact_events_company_created
  ON public.partner_contact_events(company_id, created_at DESC);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.partner_companies_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_companies_set_updated_at ON public.partner_companies;
CREATE TRIGGER trg_partner_companies_set_updated_at
BEFORE UPDATE ON public.partner_companies
FOR EACH ROW EXECUTE FUNCTION public.partner_companies_set_updated_at();

ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_company_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_company_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_company_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_company_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_contact_events ENABLE ROW LEVEL SECURITY;

-- 재실행 안전성: 정책이 이미 있으면 제거 후 재생성
DROP POLICY IF EXISTS "partner_categories_public_select" ON public.partner_categories;
DROP POLICY IF EXISTS "partner_regions_public_select" ON public.partner_regions;
DROP POLICY IF EXISTS "partner_badges_public_select" ON public.partner_badges;
DROP POLICY IF EXISTS "partner_companies_public_select_active" ON public.partner_companies;
DROP POLICY IF EXISTS "partner_company_categories_public_select" ON public.partner_company_categories;
DROP POLICY IF EXISTS "partner_company_regions_public_select" ON public.partner_company_regions;
DROP POLICY IF EXISTS "partner_company_badges_public_select" ON public.partner_company_badges;
DROP POLICY IF EXISTS "partner_company_prices_public_select" ON public.partner_company_prices;
DROP POLICY IF EXISTS "partner_admin_manage_categories" ON public.partner_categories;
DROP POLICY IF EXISTS "partner_admin_manage_regions" ON public.partner_regions;
DROP POLICY IF EXISTS "partner_admin_manage_badges" ON public.partner_badges;
DROP POLICY IF EXISTS "partner_admin_manage_companies" ON public.partner_companies;
DROP POLICY IF EXISTS "partner_admin_manage_company_categories" ON public.partner_company_categories;
DROP POLICY IF EXISTS "partner_admin_manage_company_regions" ON public.partner_company_regions;
DROP POLICY IF EXISTS "partner_admin_manage_company_badges" ON public.partner_company_badges;
DROP POLICY IF EXISTS "partner_admin_manage_company_prices" ON public.partner_company_prices;
DROP POLICY IF EXISTS "partner_admin_or_owner_read_contact_events" ON public.partner_contact_events;

-- 공개 조회: 활성 데이터만
CREATE POLICY "partner_categories_public_select"
  ON public.partner_categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "partner_regions_public_select"
  ON public.partner_regions FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "partner_badges_public_select"
  ON public.partner_badges FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "partner_companies_public_select_active"
  ON public.partner_companies FOR SELECT
  USING (status = 'active');

CREATE POLICY "partner_company_categories_public_select"
  ON public.partner_company_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.status = 'active'
    )
  );

CREATE POLICY "partner_company_regions_public_select"
  ON public.partner_company_regions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.status = 'active'
    )
  );

CREATE POLICY "partner_company_badges_public_select"
  ON public.partner_company_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.status = 'active'
    )
  );

CREATE POLICY "partner_company_prices_public_select"
  ON public.partner_company_prices FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.status = 'active'
    )
  );

-- 관리자/에디터 전체 관리
CREATE POLICY "partner_admin_manage_categories"
  ON public.partner_categories FOR ALL
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

CREATE POLICY "partner_admin_manage_regions"
  ON public.partner_regions FOR ALL
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

CREATE POLICY "partner_admin_manage_badges"
  ON public.partner_badges FOR ALL
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

CREATE POLICY "partner_admin_manage_companies"
  ON public.partner_companies FOR ALL
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

CREATE POLICY "partner_admin_manage_company_categories"
  ON public.partner_company_categories FOR ALL
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

CREATE POLICY "partner_admin_manage_company_regions"
  ON public.partner_company_regions FOR ALL
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

CREATE POLICY "partner_admin_manage_company_badges"
  ON public.partner_company_badges FOR ALL
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

CREATE POLICY "partner_admin_manage_company_prices"
  ON public.partner_company_prices FOR ALL
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

CREATE POLICY "partner_admin_or_owner_read_contact_events"
  ON public.partner_contact_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.partner_companies c
      WHERE c.id = company_id
        AND c.owner_user_id = auth.uid()
    )
  );

-- 초기 업종/지역/배지 시드
INSERT INTO public.partner_categories (code, label, sort_order)
VALUES
  ('aircon', '에어컨', 10),
  ('move_in', '입주', 20),
  ('completion', '준공', 30),
  ('stairs', '계단', 40),
  ('floor', '바닥', 50),
  ('exterior', '외벽', 60),
  ('skycar', '스카이차', 70)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

INSERT INTO public.partner_regions (code, label, parent_code, sort_order)
VALUES
  ('seoul_all', '서울전역', NULL, 10),
  ('gyeonggi_all', '경기전역', NULL, 20)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label, parent_code = EXCLUDED.parent_code, sort_order = EXCLUDED.sort_order;

INSERT INTO public.partner_badges (code, label, description, icon, sort_order)
VALUES
  ('verified', '사업자 확인', '사업자 정보 확인 완료', 'shield-check', 10),
  ('top_inquiry_monthly', '이번달 문의왕', '월간 문의량 상위 업체', 'crown', 20)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;
