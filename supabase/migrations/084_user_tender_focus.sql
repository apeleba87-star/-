-- 사용자별 입찰 목록 "내 관심" (지역 시·도 + 시·군·구, 업종 최대 4개)
CREATE TABLE IF NOT EXISTS public.user_tender_focus (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  region_sido TEXT,
  region_gugun TEXT,
  industry_codes TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_tender_focus_industry_max CHECK (cardinality(industry_codes) <= 4)
);

COMMENT ON TABLE public.user_tender_focus IS '입찰 목록 내 관심 필터: 시도·시군구(선택), 업종 코드 최대 4개';

CREATE INDEX IF NOT EXISTS idx_user_tender_focus_updated ON public.user_tender_focus (updated_at DESC);

ALTER TABLE public.user_tender_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tender_focus_select_own"
  ON public.user_tender_focus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_tender_focus_insert_own"
  ON public.user_tender_focus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_tender_focus_update_own"
  ON public.user_tender_focus FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_tender_focus_delete_own"
  ON public.user_tender_focus FOR DELETE
  USING (auth.uid() = user_id);
