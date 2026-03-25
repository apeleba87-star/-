ALTER TABLE public.daily_share_unlock_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_share_unlock_logs_insert_own" ON public.daily_share_unlock_logs;
CREATE POLICY "daily_share_unlock_logs_insert_own"
  ON public.daily_share_unlock_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

