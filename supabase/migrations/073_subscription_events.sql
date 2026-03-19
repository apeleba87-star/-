-- 구독 상태 변경 감사 로그 (취소, past_due 등)
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_events IS '구독 취소/상태 변경 감사. action: cancelled, past_due, reactivated 등';

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 (service role 사용 시 RLS 무시)
CREATE POLICY "subscription_events_admin_select"
  ON subscription_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
    )
    OR auth.uid() = user_id
  );

-- 서버(API)에서만 삽입. insert는 service role로 하므로 policy는 본인 또는 없음.
-- API에서 service role로 insert할 때 RLS 우회됨. anon으로 insert 불가하게 하려면 policy에서 WITH CHECK false and do inserts only from server.
CREATE POLICY "subscription_events_insert_own"
  ON subscription_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
