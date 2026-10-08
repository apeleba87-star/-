-- AI 블로그 사용 권한: 사이트 관리자가 수동 결제 확인 후 사용자별로 부여·연장한다.
-- 권한 없음 → 사용 불가 / 만료·정지 → 보기·옮기기만 (새 현장·AI 생성 불가)

-- ─────────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleanidex.ai_blog_access (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES cleanidex.ai_plans(code),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  expires_on DATE NOT NULL,
  memo TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_ai_blog_access_expires
  ON cleanidex.ai_blog_access(expires_on);

CREATE TABLE IF NOT EXISTS cleanidex.ai_blog_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('grant', 'extend', 'set_expiry', 'change_plan', 'suspend', 'resume')),
  plan_code TEXT,
  prev_expires_on DATE,
  new_expires_on DATE,
  amount_krw INT,
  payer_name TEXT,
  memo TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_ai_blog_access_logs_user
  ON cleanidex.ai_blog_access_logs(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_cleanidex_ai_blog_access_updated_at ON cleanidex.ai_blog_access;
CREATE TRIGGER trg_cleanidex_ai_blog_access_updated_at
  BEFORE UPDATE ON cleanidex.ai_blog_access
  FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

-- ─────────────────────────────────────────────
-- 2. RLS: 본인 권한 조회만. 쓰기는 관리자 API(service_role)만.
-- ─────────────────────────────────────────────
ALTER TABLE cleanidex.ai_blog_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cleanidex_ai_blog_access_select_own" ON cleanidex.ai_blog_access;
CREATE POLICY "cleanidex_ai_blog_access_select_own" ON cleanidex.ai_blog_access
  FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON TABLE cleanidex.ai_blog_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.ai_blog_access TO service_role;

ALTER TABLE cleanidex.ai_blog_access_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.ai_blog_access_logs TO service_role;

-- ─────────────────────────────────────────────
-- 3. 권한 상태 / 적용 요금제
-- ─────────────────────────────────────────────
-- 'active' | 'expired' | 'suspended' | 'none'. 사이트 관리자(profiles.role = 'admin')는 항상 active.
CREATE OR REPLACE FUNCTION cleanidex.ai_access_state(p_user UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
  SELECT coalesce(
    (SELECT 'active' FROM public.profiles pr WHERE pr.id = p_user AND pr.role = 'admin'),
    (SELECT CASE
              WHEN a.status = 'suspended' THEN 'suspended'
              WHEN a.expires_on < (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN 'expired'
              ELSE 'active'
            END
       FROM cleanidex.ai_blog_access a WHERE a.user_id = p_user),
    'none'
  )
$$;

CREATE OR REPLACE FUNCTION cleanidex.ai_user_plan(p_user UUID)
RETURNS cleanidex.ai_plans
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
  SELECT p.*
  FROM cleanidex.ai_plans p
  WHERE p.code = coalesce(
    (SELECT a.plan_code FROM cleanidex.ai_blog_access a WHERE a.user_id = p_user),
    (SELECT d.code FROM cleanidex.ai_plans d WHERE d.is_default AND d.is_active LIMIT 1)
  )
$$;

-- ─────────────────────────────────────────────
-- 4. 사용량 요약: 요금제를 사용자 권한 기준으로
-- ─────────────────────────────────────────────
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
  v_plan := cleanidex.ai_user_plan(auth.uid());
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

-- ─────────────────────────────────────────────
-- 5. 생성 예약: 권한 확인 추가 (화면 우회 방지)
-- ─────────────────────────────────────────────
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
  v_access TEXT;
BEGIN
  SELECT * INTO v_ctx FROM cleanidex.my_context();
  IF v_ctx.company_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'cleanidex_membership_required'::TEXT, FALSE; RETURN;
  END IF;
  IF v_ctx.role_code IS DISTINCT FROM 'admin' THEN
    RETURN QUERY SELECT FALSE, 'admin_required'::TEXT, FALSE; RETURN;
  END IF;

  v_access := cleanidex.ai_access_state(auth.uid());
  IF v_access <> 'active' THEN
    RETURN QUERY SELECT FALSE, ('ai_access_' || v_access)::TEXT, FALSE; RETURN;
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

  v_plan := cleanidex.ai_user_plan(auth.uid());

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

-- ─────────────────────────────────────────────
-- 6. 업체 최초 생성도 권한 있는 사용자만
-- ─────────────────────────────────────────────
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

  IF cleanidex.ai_access_state(v_uid) <> 'active' THEN
    RAISE EXCEPTION 'ai_access_required';
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
