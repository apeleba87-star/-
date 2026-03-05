-- 부트페이 빌링 기반 구독 (빌링키 저장 + 주기 결제)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly')),
  amount_cents INT NOT NULL DEFAULT 9900,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  next_billing_at DATE NOT NULL,
  last_receipt_id TEXT,
  last_billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.subscriptions IS '부트페이 빌링키 기반 구독. next_billing_at에 cron으로 결제 요청.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인만 조회/수정 (빌링키는 서버에서만 사용)
CREATE POLICY "subscriptions_own_select" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_own_update" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
-- INSERT는 서버(service role) 또는 본인(구독 등록 시) — API에서 service role로 삽입 권장
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- DELETE는 관리자 또는 본인(해지)
CREATE POLICY "subscriptions_delete_own" ON subscriptions FOR DELETE USING (auth.uid() = user_id);
