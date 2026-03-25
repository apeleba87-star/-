-- 무료 사용자: 공유 1회로 하루 1회 상세 패널 열람권
CREATE TABLE IF NOT EXISTS public.daily_share_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_kst DATE NOT NULL,
  shared_at TIMESTAMPTZ,
  unlock_granted BOOLEAN NOT NULL DEFAULT true,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date_kst)
);

CREATE INDEX IF NOT EXISTS idx_daily_share_unlocks_user_date ON public.daily_share_unlocks(user_id, date_kst DESC);

ALTER TABLE public.daily_share_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_share_unlocks_select_own" ON public.daily_share_unlocks;
CREATE POLICY "daily_share_unlocks_select_own"
  ON public.daily_share_unlocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_share_unlocks_insert_own" ON public.daily_share_unlocks;
CREATE POLICY "daily_share_unlocks_insert_own"
  ON public.daily_share_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_share_unlocks_update_own" ON public.daily_share_unlocks;
CREATE POLICY "daily_share_unlocks_update_own"
  ON public.daily_share_unlocks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

