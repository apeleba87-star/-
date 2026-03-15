-- profiles_select_admin 정책이 profiles를 다시 조회해 무한 재귀 발생.
-- 관리자 여부를 별도 테이블로 두고, 정책에서 해당 테이블만 참조하도록 변경.

-- 1) 관리자 user_id 목록 테이블 (정책에서만 사용, 재귀 없음)
CREATE TABLE IF NOT EXISTS public.admin_user_ids (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.admin_user_ids IS '관리자/에디터 user_id. profiles RLS 정책에서 재귀 없이 조회용';

ALTER TABLE public.admin_user_ids ENABLE ROW LEVEL SECURITY;
-- 조회는 서버/함수에서만 필요. anon/authenticated는 직접 SELECT 불가하게 둠
CREATE POLICY "admin_user_ids_no_direct_select" ON public.admin_user_ids FOR SELECT USING (false);

-- 2) 현재 profiles에서 admin/editor인 사용자 동기화
INSERT INTO public.admin_user_ids (user_id)
SELECT id FROM public.profiles WHERE role IN ('admin', 'editor')
ON CONFLICT (user_id) DO NOTHING;

-- 3) 재귀 없이 관리자 여부 확인하는 함수
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_user_ids WHERE user_id = auth.uid());
$$;
COMMENT ON FUNCTION public.is_current_user_admin() IS '현재 세션이 관리자/에디터인지. profiles 정책에서 사용(재귀 방지)';

-- 4) 기존 재귀 정책 제거 후 새 정책 추가
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_current_user_admin()
  );
COMMENT ON POLICY "profiles_select_admin" ON public.profiles IS '본인 행 또는 관리자일 때 전체 프로필 조회';
