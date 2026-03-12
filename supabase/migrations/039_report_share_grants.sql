-- 공유하기로 이전 리포트 하루 1회 열람 부여
-- user_id + post_id + grant_date(KST) 당 1건, used_at으로 사용 여부

CREATE TABLE IF NOT EXISTS public.report_share_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  grant_date DATE NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id, grant_date)
);

CREATE INDEX IF NOT EXISTS idx_report_share_grants_lookup
  ON public.report_share_grants(user_id, post_id, grant_date) WHERE used_at IS NULL;

COMMENT ON TABLE public.report_share_grants IS '공유하기 시 부여: 이전 리포트 하루 1회 열람. grant_date=KST 기준일, used_at 소비 시점.';

ALTER TABLE public.report_share_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_share_grants_own"
  ON public.report_share_grants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
