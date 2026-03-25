CREATE TABLE IF NOT EXISTS public.job_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('share_click', 'share_open', 'share_apply')),
  channel TEXT NOT NULL DEFAULT 'unknown',
  ref TEXT,
  user_agent TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_share_events_post_created
  ON public.job_share_events(job_post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_share_events_owner_created
  ON public.job_share_events(owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_share_events_type_created
  ON public.job_share_events(event_type, created_at DESC);

ALTER TABLE public.job_share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_share_events_select_owner" ON public.job_share_events;
CREATE POLICY "job_share_events_select_owner"
  ON public.job_share_events FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "job_share_events_insert_actor" ON public.job_share_events;
CREATE POLICY "job_share_events_insert_actor"
  ON public.job_share_events FOR INSERT
  WITH CHECK (auth.uid() = actor_user_id OR actor_user_id IS NULL);

