-- 관리자가 전체 회원(profiles) 목록을 조회할 수 있도록 정책 추가

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor'))
  );

COMMENT ON POLICY "profiles_select_admin" ON public.profiles IS '관리자/에디터: 모든 프로필 조회(사용자 관리 화면용)';
