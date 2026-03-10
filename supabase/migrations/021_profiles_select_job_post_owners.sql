-- 구인 목록에서 구인자 닉네임(표시명) 표시를 위해, 구인글을 올린 사용자의 프로필을 공개 조회 허용
CREATE POLICY "profiles_select_job_post_owners" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.job_posts j WHERE j.user_id = profiles.id));

COMMENT ON POLICY "profiles_select_job_post_owners" ON public.profiles IS '구인글 작성자 프로필(닉네임 등) 목록 노출용';
