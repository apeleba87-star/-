-- 관리자 권한 부여
-- 1) 먼저 http://localhost:3001/signup 에서 apeleba2@naver.com 으로 회원가입
-- 2) 아래 SQL을 Supabase 대시보드 > SQL Editor 에서 실행

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'apeleba2@naver.com';

-- 실행 후 "Success" 와 함께 1 row 가 나오면 적용됨.
-- 해당 이메일로 로그인하면 /admin 접근 가능.
