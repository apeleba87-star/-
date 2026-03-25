CREATE TABLE IF NOT EXISTS public.daily_share_unlock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_kst DATE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant', 'consume', 'consume_blocked')),
  channel TEXT NOT NULL DEFAULT 'unknown',
  ip_hash TEXT,
  user_agent TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_share_unlock_logs_user_date
  ON public.daily_share_unlock_logs(user_id, date_kst DESC);

CREATE INDEX IF NOT EXISTS idx_daily_share_unlock_logs_created_at
  ON public.daily_share_unlock_logs(created_at DESC);

ALTER TABLE public.daily_share_unlock_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_share_unlock_logs_select_own" ON public.daily_share_unlock_logs;
CREATE POLICY "daily_share_unlock_logs_select_own"
  ON public.daily_share_unlock_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 일반 사용자의 INSERT/UPDATE/DELETE는 허용하지 않음(서버 API 경유)
