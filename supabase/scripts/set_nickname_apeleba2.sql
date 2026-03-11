-- 로그인 계정 apeleba2@naver.com 의 worker_profiles 별명을 '관리자'로 설정
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

-- 1) 해당 사용자에게 worker_profiles 행이 있으면 nickname 업데이트
UPDATE public.worker_profiles
SET nickname = '관리자', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'apeleba2@naver.com');

-- 2) 행이 없으면 새로 삽입
INSERT INTO public.worker_profiles (user_id, nickname, updated_at)
SELECT u.id, '관리자', NOW()
FROM auth.users u
WHERE u.email = 'apeleba2@naver.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.worker_profiles w WHERE w.user_id = u.id
  );
