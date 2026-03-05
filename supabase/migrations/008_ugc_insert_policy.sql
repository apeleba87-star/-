-- UGC INSERT 정책 명시: 비로그인(user_id IS NULL) 또는 본인(user_id = auth.uid())만 등록 가능
-- 일부 환경에서 auth.uid()가 NULL일 때 (NULL = user_id)가 false로 해석되는 경우 대비
DROP POLICY IF EXISTS "ugc_insert" ON public.ugc;
CREATE POLICY "ugc_insert" ON public.ugc
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );
