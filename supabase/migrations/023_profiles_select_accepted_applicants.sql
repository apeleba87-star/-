-- 구인자가 자신의 구인글에 '확정'된 지원자의 프로필(연락처·이메일 등)을 조회할 수 있도록 허용
CREATE POLICY "profiles_select_accepted_applicants" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications a
      JOIN public.job_post_positions p ON p.id = a.position_id
      JOIN public.job_posts j ON j.id = p.job_post_id
      WHERE j.user_id = auth.uid()
        AND a.user_id = profiles.id
        AND a.status = 'accepted'
    )
  );

COMMENT ON POLICY "profiles_select_accepted_applicants" ON public.profiles IS '구인자: 확정된 지원자의 연락처·이메일 확인용';
