-- AI 블로그 부트페이 구독 + 무료 체험(3일/3개) + 프로모(100원 1·2개월)

-- ─────────────────────────────────────────────
-- 1. 요금제: TRIAL / PRO
-- ─────────────────────────────────────────────
INSERT INTO cleanidex.ai_plans
  (code, name, monthly_price_krw, monthly_content_limit, max_generations_per_content, max_partial_rewrites_per_content, is_default, is_active, sort_order)
VALUES
  ('TRIAL', '무료 체험', 0, 3, 3, 5, FALSE, TRUE, 0),
  ('PRO', 'AI 블로그 프로', 29900, 30, 3, 10, FALSE, TRUE, 10)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_content_limit = EXCLUDED.monthly_content_limit,
  max_generations_per_content = EXCLUDED.max_generations_per_content,
  max_partial_rewrites_per_content = EXCLUDED.max_partial_rewrites_per_content,
  is_active = TRUE,
  updated_at = NOW();

-- BASIC은 수동 부여·레거시용으로 유지 (기본값 해제하지 않음 — 기존 권한 호환)

-- ─────────────────────────────────────────────
-- 2. AI 블로그 구독 (부트페이 빌링키)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  plan_code TEXT NOT NULL DEFAULT 'PRO',
  amount_cents INT NOT NULL DEFAULT 29900,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  promo_months INT NOT NULL DEFAULT 0,
  promo_remaining_months INT,
  next_billing_at DATE NOT NULL,
  last_receipt_id TEXT,
  last_billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.ai_blog_subscriptions IS 'AI 블로그 부트페이 빌링 구독. next_billing_at에 cron으로 결제.';

CREATE INDEX IF NOT EXISTS idx_ai_blog_subscriptions_next_billing
  ON public.ai_blog_subscriptions(next_billing_at) WHERE status = 'active';

ALTER TABLE public.ai_blog_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_blog_subscriptions_own_select" ON public.ai_blog_subscriptions;
CREATE POLICY "ai_blog_subscriptions_own_select" ON public.ai_blog_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_blog_subscriptions_own_update" ON public.ai_blog_subscriptions;
CREATE POLICY "ai_blog_subscriptions_own_update" ON public.ai_blog_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_blog_subscriptions_insert_own" ON public.ai_blog_subscriptions;
CREATE POLICY "ai_blog_subscriptions_insert_own" ON public.ai_blog_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_blog_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_blog_subscriptions TO service_role;

-- ─────────────────────────────────────────────
-- 3. 체험 1회 기록
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_trial_claims (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_on DATE NOT NULL
);

ALTER TABLE public.ai_blog_trial_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_blog_trial_claims_own_select" ON public.ai_blog_trial_claims;
CREATE POLICY "ai_blog_trial_claims_own_select" ON public.ai_blog_trial_claims
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON TABLE public.ai_blog_trial_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_blog_trial_claims TO service_role;

-- ─────────────────────────────────────────────
-- 4. 앱 설정 기본값
-- ─────────────────────────────────────────────
INSERT INTO public.app_settings (key, value, updated_at)
VALUES
  ('ai_blog_amount_cents', to_jsonb(29900), NOW()),
  (
    'ai_blog_promo',
    jsonb_build_object(
      'enabled', true,
      'amount_cents', 100,
      'month_options', jsonb_build_array(1, 2),
      'start_date', null,
      'end_date', null
    ),
    NOW()
  ),
  (
    'ai_blog_trial',
    jsonb_build_object(
      'enabled', true,
      'days', 3,
      'plan_code', 'TRIAL'
    ),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;
