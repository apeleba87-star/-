-- 사용자별 인앱 알림 (종 + /notifications)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'tender_new',
    'tender_deadline',
    'job_application',
    'subscription',
    'system'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_notifications_user_dedupe UNIQUE (user_id, dedupe_key)
);

COMMENT ON TABLE public.user_notifications IS '인앱 알림: 입찰·구인·구독 등 (dedupe_key로 중복 삽입 방지)';

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_notifications_insert_own"
  ON public.user_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_notifications_update_own"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_notifications_delete_own"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id);
