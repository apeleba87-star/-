-- AI 블로그 초안: 현장(projects) 중심 데이터 + 콘텐츠 + 요금제/사용량.
-- 사진 바이너리는 저장하지 않는다(사용자 PC 로컬 전용). project_media 는 메타데이터만.
-- AI 기능은 회사 admin(대표)만 사용. 한도는 회사 단위.

-- ─────────────────────────────────────────────
-- 1. 업체 프로필 (회사 1:1)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleanidex.business_profiles (
  company_id UUID PRIMARY KEY REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  base_region TEXT,
  service_regions TEXT[] NOT NULL DEFAULT '{}',
  main_services TEXT[] NOT NULL DEFAULT '{}',
  career_years INT,
  intro TEXT,
  strengths TEXT,
  target_customers TEXT,
  writing_style TEXT NOT NULL DEFAULT 'story' CHECK (writing_style IN ('story', 'expert', 'checkpoint')),
  cta_text TEXT,
  homepage_url TEXT,
  naver_place_url TEXT,
  banned_phrases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_profiles_name_chk CHECK (length(btrim(business_name)) > 0)
);

-- ─────────────────────────────────────────────
-- 2. 현장 (AI 와 독립된 핵심 엔티티)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleanidex.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  region_sido TEXT,
  region_sigungu TEXT,
  region_dong TEXT,
  property_type TEXT,
  area_pyeong NUMERIC(6, 1),
  worker_count INT,
  work_minutes INT,
  price INT,
  work_date DATE,
  description TEXT,
  site_id UUID REFERENCES cleanidex.sites(id) ON DELETE SET NULL,
  work_session_id UUID REFERENCES cleanidex.work_sessions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT projects_service_type_chk CHECK (length(btrim(service_type)) > 0)
);
COMMENT ON COLUMN cleanidex.projects.region_dong IS '동 단위까지만 저장. 상세 주소(번지·동호수)는 저장하지 않는다.';
COMMENT ON COLUMN cleanidex.projects.price IS '업체 비공개. AI 프롬프트에 넣지 않는다.';
CREATE INDEX IF NOT EXISTS idx_cleanidex_projects_company
  ON cleanidex.projects(company_id, created_at DESC) WHERE deleted_at IS NULL;

-- 오염/재질/제품/공간 (지식 DB id 참조, 목록에 없으면 custom_label)
CREATE TABLE IF NOT EXISTS cleanidex.project_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES cleanidex.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  attr_type TEXT NOT NULL CHECK (attr_type IN ('CONTAMINANT', 'MATERIAL', 'PRODUCT', 'SPACE')),
  ref_id TEXT,
  custom_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_attributes_value_chk CHECK (ref_id IS NOT NULL OR length(btrim(coalesce(custom_label, ''))) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cleanidex_project_attributes
  ON cleanidex.project_attributes(project_id, attr_type, coalesce(ref_id, ''), coalesce(custom_label, ''));
CREATE INDEX IF NOT EXISTS idx_cleanidex_project_attributes_ref
  ON cleanidex.project_attributes(attr_type, ref_id);

-- 사진 메타데이터 (바이너리 없음)
CREATE TABLE IF NOT EXISTS cleanidex.project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES cleanidex.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'OTHER' CHECK (media_type IN ('BEFORE', 'AFTER', 'PROCESS', 'OTHER')),
  sort_order INT NOT NULL DEFAULT 0,
  space_type TEXT,
  local_name TEXT NOT NULL,
  local_size BIGINT,
  local_modified_at TIMESTAMPTZ,
  taken_at TIMESTAMPTZ,
  width INT,
  height INT,
  storage_path TEXT,
  ai_description TEXT,
  ai_tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN cleanidex.project_media.local_name IS '사용자 PC 의 파일명. 파일명+크기+수정일로 로컬 파일을 다시 매칭한다.';
COMMENT ON COLUMN cleanidex.project_media.storage_path IS '향후 클라우드 보관 옵션용. 현재는 항상 NULL.';
CREATE INDEX IF NOT EXISTS idx_cleanidex_project_media_project
  ON cleanidex.project_media(project_id, sort_order);

-- 전후 짝 (현장 단위 — 블로그/포트폴리오/보고서가 공유)
CREATE TABLE IF NOT EXISTS cleanidex.media_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES cleanidex.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  memo TEXT NOT NULL DEFAULT '',
  before_media_id UUID REFERENCES cleanidex.project_media(id) ON DELETE SET NULL,
  after_media_id UUID REFERENCES cleanidex.project_media(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_media_pairs_project
  ON cleanidex.media_pairs(project_id, sort_order);

-- ─────────────────────────────────────────────
-- 3. 콘텐츠 (채널 확장형)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleanidex.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES cleanidex.projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'NAVER_BLOG'
    CHECK (channel IN ('NAVER_BLOG', 'NAVER_PLACE', 'DAANGN', 'INSTAGRAM', 'WEBSITE', 'CLIENT_REPORT')),
  keyword TEXT NOT NULL DEFAULT '',
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  extra_request TEXT NOT NULL DEFAULT '',
  mode SMALLINT CHECK (mode IN (1, 2, 3)),
  variant JSONB,
  title TEXT NOT NULL DEFAULT '',
  title_candidates TEXT[] NOT NULL DEFAULT '{}',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY', 'DONE', 'ARCHIVED')),
  ai_model TEXT,
  prompt_version TEXT,
  generation_count INT NOT NULL DEFAULT 0,
  partial_rewrite_count INT NOT NULL DEFAULT 0,
  generation_lock_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
COMMENT ON COLUMN cleanidex.contents.blocks IS '[{id,type:"paragraph",text}|{id,type:"image",media_id,role,pair_id}] — 텍스트는 순수 텍스트만.';
CREATE INDEX IF NOT EXISTS idx_cleanidex_contents_company
  ON cleanidex.contents(company_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cleanidex_contents_project
  ON cleanidex.contents(project_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cleanidex.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES cleanidex.contents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL CHECK (reason IN ('AI_FULL', 'AI_PARTIAL', 'MANUAL')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_content_versions_content
  ON cleanidex.content_versions(content_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 4. 요금제 / 구독 / 사용량
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleanidex.ai_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price_krw INT NOT NULL DEFAULT 0,
  monthly_content_limit INT NOT NULL,
  max_generations_per_content INT NOT NULL,
  max_partial_rewrites_per_content INT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cleanidex_ai_plans_default
  ON cleanidex.ai_plans(is_default) WHERE is_default;

INSERT INTO cleanidex.ai_plans
  (code, name, monthly_price_krw, monthly_content_limit, max_generations_per_content, max_partial_rewrites_per_content, is_default, sort_order)
VALUES ('BASIC', '기본', 0, 20, 3, 10, TRUE, 0)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS cleanidex.company_ai_subscriptions (
  company_id UUID PRIMARY KEY REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES cleanidex.ai_plans(code),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_start DATE,
  current_period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 월 한도 카운터 (KST 기준 YYYYMM)
CREATE TABLE IF NOT EXISTS cleanidex.ai_usage_counters (
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  contents_created INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, period)
);

CREATE TABLE IF NOT EXISTS cleanidex.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_id UUID REFERENCES cleanidex.contents(id) ON DELETE SET NULL,
  feature TEXT NOT NULL CHECK (feature IN ('generate', 'regenerate', 'rewrite_partial')),
  model TEXT,
  input_tokens INT NOT NULL DEFAULT 0,
  cached_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  image_count INT NOT NULL DEFAULT 0,
  estimated_cost_krw NUMERIC(12, 2),
  latency_ms INT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_ai_usage_logs_company
  ON cleanidex.ai_usage_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_ai_usage_logs_created
  ON cleanidex.ai_usage_logs(created_at DESC);

-- 모델 단가 (코드 하드코딩 금지 — 관리자 갱신)
CREATE TABLE IF NOT EXISTS cleanidex.ai_model_prices (
  model TEXT PRIMARY KEY,
  input_per_1m_usd NUMERIC(10, 4) NOT NULL,
  cached_input_per_1m_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  output_per_1m_usd NUMERIC(10, 4) NOT NULL,
  usd_krw NUMERIC(10, 2) NOT NULL DEFAULT 1400,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO cleanidex.ai_model_prices (model, input_per_1m_usd, cached_input_per_1m_usd, output_per_1m_usd)
VALUES ('gpt-4.1-mini', 0.40, 0.10, 1.60)
ON CONFLICT (model) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. updated_at 트리거
-- ─────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_profiles', 'projects', 'media_pairs', 'contents', 'ai_plans', 'company_ai_subscriptions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_cleanidex_%1$s_updated_at ON cleanidex.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_cleanidex_%1$s_updated_at BEFORE UPDATE ON cleanidex.%1$I FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at()',
      t
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_profiles', 'projects', 'project_attributes', 'project_media', 'media_pairs', 'contents', 'content_versions']
  LOOP
    EXECUTE format('ALTER TABLE cleanidex.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "cleanidex_%1$s_rw_company" ON cleanidex.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "cleanidex_%1$s_rw_company" ON cleanidex.%1$I FOR ALL TO authenticated
         USING (company_id = cleanidex.current_company_id())
         WITH CHECK (company_id = cleanidex.current_company_id())',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.%I TO authenticated, service_role', t);
  END LOOP;
END $$;

-- 사용량·구독: 본인 회사 조회만. 쓰기는 RPC/service_role.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_ai_subscriptions', 'ai_usage_counters', 'ai_usage_logs']
  LOOP
    EXECUTE format('ALTER TABLE cleanidex.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "cleanidex_%1$s_select_company" ON cleanidex.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "cleanidex_%1$s_select_company" ON cleanidex.%1$I FOR SELECT TO authenticated
         USING (company_id = cleanidex.current_company_id())',
      t
    );
    EXECUTE format('GRANT SELECT ON TABLE cleanidex.%I TO authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.%I TO service_role', t);
  END LOOP;
END $$;

ALTER TABLE cleanidex.ai_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cleanidex_ai_plans_select_active" ON cleanidex.ai_plans;
CREATE POLICY "cleanidex_ai_plans_select_active" ON cleanidex.ai_plans
  FOR SELECT TO authenticated USING (is_active);
GRANT SELECT ON TABLE cleanidex.ai_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.ai_plans TO service_role;

ALTER TABLE cleanidex.ai_model_prices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.ai_model_prices TO service_role;

-- ─────────────────────────────────────────────
-- 7. RPC
-- ─────────────────────────────────────────────

-- 회사가 없는 회원: 업체 프로필 최초 저장 시 회사 생성 + admin 멤버 등록.
CREATE OR REPLACE FUNCTION cleanidex.ai_bootstrap_company(p_business_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_company UUID;
  v_role UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT company_id INTO v_company FROM cleanidex.users WHERE id = v_uid;
  IF v_company IS NOT NULL THEN
    RETURN v_company;
  END IF;

  IF length(btrim(coalesce(p_business_name, ''))) = 0 THEN
    RAISE EXCEPTION 'business_name_required';
  END IF;

  SELECT id INTO v_role FROM cleanidex.roles WHERE code = 'admin';

  INSERT INTO cleanidex.companies (name, owner_user_id)
  VALUES (btrim(p_business_name), v_uid)
  RETURNING id INTO v_company;

  INSERT INTO cleanidex.users (id, company_id, role_id, is_active)
  VALUES (v_uid, v_company, v_role, TRUE);

  RETURN v_company;
END;
$$;
GRANT EXECUTE ON FUNCTION cleanidex.ai_bootstrap_company(TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.cleanidex_ai_bootstrap_company(p_business_name TEXT)
RETURNS UUID LANGUAGE SQL SECURITY DEFINER SET search_path = cleanidex, public
AS $$ SELECT cleanidex.ai_bootstrap_company(p_business_name); $$;
GRANT EXECUTE ON FUNCTION public.cleanidex_ai_bootstrap_company(TEXT) TO authenticated;

-- 회사 적용 요금제 (구독 없으면 기본 요금제)
CREATE OR REPLACE FUNCTION cleanidex.ai_effective_plan(p_company UUID)
RETURNS cleanidex.ai_plans
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
  SELECT p.*
  FROM cleanidex.ai_plans p
  WHERE p.code = coalesce(
    (SELECT s.plan_code FROM cleanidex.company_ai_subscriptions s
      WHERE s.company_id = p_company AND s.status = 'active'),
    (SELECT d.code FROM cleanidex.ai_plans d WHERE d.is_default AND d.is_active LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION cleanidex.ai_current_period()
RETURNS TEXT LANGUAGE SQL STABLE
AS $$ SELECT to_char(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMM') $$;

-- 사용량 요약 (화면 상단 "이번 달 n/20편")
CREATE OR REPLACE FUNCTION public.cleanidex_ai_usage_summary()
RETURNS TABLE (
  plan_code TEXT,
  plan_name TEXT,
  period TEXT,
  contents_used INT,
  monthly_content_limit INT,
  max_generations_per_content INT,
  max_partial_rewrites_per_content INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_company UUID := cleanidex.current_company_id();
  v_plan cleanidex.ai_plans;
  v_period TEXT := cleanidex.ai_current_period();
BEGIN
  IF v_company IS NULL THEN
    RETURN;
  END IF;
  v_plan := cleanidex.ai_effective_plan(v_company);
  RETURN QUERY
  SELECT
    v_plan.code,
    v_plan.name,
    v_period,
    coalesce((SELECT c.contents_created FROM cleanidex.ai_usage_counters c
               WHERE c.company_id = v_company AND c.period = v_period), 0),
    v_plan.monthly_content_limit,
    v_plan.max_generations_per_content,
    v_plan.max_partial_rewrites_per_content;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanidex_ai_usage_summary() TO authenticated;

-- 생성 예약: 잠금 + 한도 확인 + 차감을 한 트랜잭션에서.
-- p_kind: 'generation'(최초/전체 재생성) | 'rewrite'(부분 재작성)
CREATE OR REPLACE FUNCTION public.cleanidex_ai_reserve(p_content_id UUID, p_kind TEXT)
RETURNS TABLE (ok BOOLEAN, error_code TEXT, is_first BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_ctx RECORD;
  v_content cleanidex.contents;
  v_plan cleanidex.ai_plans;
  v_period TEXT := cleanidex.ai_current_period();
  v_used INT;
BEGIN
  SELECT * INTO v_ctx FROM cleanidex.my_context();
  IF v_ctx.company_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'cleanidex_membership_required'::TEXT, FALSE; RETURN;
  END IF;
  IF v_ctx.role_code IS DISTINCT FROM 'admin' THEN
    RETURN QUERY SELECT FALSE, 'admin_required'::TEXT, FALSE; RETURN;
  END IF;

  SELECT * INTO v_content FROM cleanidex.contents
  WHERE id = p_content_id AND company_id = v_ctx.company_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'content_not_found'::TEXT, FALSE; RETURN;
  END IF;

  IF v_content.generation_lock_until IS NOT NULL AND v_content.generation_lock_until > NOW() THEN
    RETURN QUERY SELECT FALSE, 'generation_in_progress'::TEXT, FALSE; RETURN;
  END IF;

  v_plan := cleanidex.ai_effective_plan(v_ctx.company_id);

  IF p_kind = 'rewrite' THEN
    IF v_content.generation_count = 0 THEN
      RETURN QUERY SELECT FALSE, 'generate_first'::TEXT, FALSE; RETURN;
    END IF;
    IF v_content.partial_rewrite_count >= v_plan.max_partial_rewrites_per_content THEN
      RETURN QUERY SELECT FALSE, 'rewrite_limit_reached'::TEXT, FALSE; RETURN;
    END IF;
    UPDATE cleanidex.contents
      SET partial_rewrite_count = partial_rewrite_count + 1,
          generation_lock_until = NOW() + INTERVAL '90 seconds'
      WHERE id = p_content_id;
    RETURN QUERY SELECT TRUE, NULL::TEXT, FALSE; RETURN;
  END IF;

  IF p_kind <> 'generation' THEN
    RETURN QUERY SELECT FALSE, 'invalid_kind'::TEXT, FALSE; RETURN;
  END IF;

  IF v_content.generation_count >= v_plan.max_generations_per_content THEN
    RETURN QUERY SELECT FALSE, 'generation_limit_reached'::TEXT, FALSE; RETURN;
  END IF;

  IF v_content.generation_count = 0 THEN
    INSERT INTO cleanidex.ai_usage_counters (company_id, period, contents_created)
    VALUES (v_ctx.company_id, v_period, 0)
    ON CONFLICT (company_id, period) DO NOTHING;

    SELECT contents_created INTO v_used FROM cleanidex.ai_usage_counters
    WHERE company_id = v_ctx.company_id AND period = v_period
    FOR UPDATE;

    IF v_used >= v_plan.monthly_content_limit THEN
      RETURN QUERY SELECT FALSE, 'monthly_limit_reached'::TEXT, TRUE; RETURN;
    END IF;

    UPDATE cleanidex.ai_usage_counters
      SET contents_created = contents_created + 1, updated_at = NOW()
      WHERE company_id = v_ctx.company_id AND period = v_period;
  END IF;

  UPDATE cleanidex.contents
    SET generation_count = generation_count + 1,
        generation_lock_until = NOW() + INTERVAL '90 seconds'
    WHERE id = p_content_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, (v_content.generation_count = 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanidex_ai_reserve(UUID, TEXT) TO authenticated;

-- 실패 시 예약 취소 (차감 환불). 성공 시 p_success=TRUE 로 잠금만 해제.
CREATE OR REPLACE FUNCTION public.cleanidex_ai_release(p_content_id UUID, p_kind TEXT, p_success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_company UUID := cleanidex.current_company_id();
  v_content cleanidex.contents;
  v_period TEXT := cleanidex.ai_current_period();
BEGIN
  SELECT * INTO v_content FROM cleanidex.contents
  WHERE id = p_content_id AND company_id = v_company
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_success THEN
    UPDATE cleanidex.contents SET generation_lock_until = NULL WHERE id = p_content_id;
    RETURN;
  END IF;

  IF p_kind = 'rewrite' THEN
    UPDATE cleanidex.contents
      SET partial_rewrite_count = greatest(partial_rewrite_count - 1, 0),
          generation_lock_until = NULL
      WHERE id = p_content_id;
    RETURN;
  END IF;

  UPDATE cleanidex.contents
    SET generation_count = greatest(generation_count - 1, 0),
        generation_lock_until = NULL
    WHERE id = p_content_id;

  IF v_content.generation_count = 1 THEN
    UPDATE cleanidex.ai_usage_counters
      SET contents_created = greatest(contents_created - 1, 0), updated_at = NOW()
      WHERE company_id = v_company AND period = v_period;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanidex_ai_release(UUID, TEXT, BOOLEAN) TO authenticated;
