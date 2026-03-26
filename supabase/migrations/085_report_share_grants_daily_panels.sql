-- 리포트 공유: KST 기준 계정당 하루 1건 + 심화 패널 키 3개
-- (039 미적용 DB에서도 단독 실행 가능. Supabase SQL Editor는 파일 전체를 위에서부터 실행할 것.)

-- 1) 테이블이 없으면 생성 (039와 호환 컬럼 + revealed_panel_keys)
CREATE TABLE IF NOT EXISTS public.report_share_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  grant_date DATE NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revealed_panel_keys TEXT[] DEFAULT NULL
);

-- 2) 기존 039 테이블에만 있던 경우 컬럼 추가
ALTER TABLE public.report_share_grants
  ADD COLUMN IF NOT EXISTS revealed_panel_keys TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.report_share_grants.revealed_panel_keys IS '공유 해금 시 무작위로 연 심화 패널 식별자 배열 (week_compare, drilldown 등)';
COMMENT ON TABLE public.report_share_grants IS '공유 시 당일 열람: (user_id, grant_date)당 1행, post_id·revealed_panel_keys';

ALTER TABLE public.report_share_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_share_grants_own" ON public.report_share_grants;
CREATE POLICY "report_share_grants_own"
  ON public.report_share_grants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) 동일 (user_id, grant_date) 중복 행 제거 (최신 행만 유지)
DELETE FROM public.report_share_grants a
WHERE a.id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, grant_date
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM public.report_share_grants
  ) t
  WHERE t.rn > 1
);

-- 4) 039의 UNIQUE(user_id, post_id, grant_date) 제거 후 (user_id, grant_date) 유일로 전환
ALTER TABLE public.report_share_grants
  DROP CONSTRAINT IF EXISTS report_share_grants_user_id_post_id_grant_date_key;

DROP INDEX IF EXISTS idx_report_share_grants_lookup;

CREATE UNIQUE INDEX IF NOT EXISTS report_share_grants_user_id_grant_date_uidx
  ON public.report_share_grants (user_id, grant_date);

CREATE INDEX IF NOT EXISTS idx_report_share_grants_user_recent
  ON public.report_share_grants (user_id, grant_date DESC);
