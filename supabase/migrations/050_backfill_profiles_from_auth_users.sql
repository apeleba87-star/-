-- auth.users에는 있으나 profiles에 없는 사용자(구글/카카오 OAuth 등) 프로필 백필
-- 트리거(on_auth_user_created)는 가입 시에만 실행되므로, 트리거 추가 전 가입자·일시 실패 건은
-- profiles에 없을 수 있음. 이 스크립트로 한 번 채워 두면 관리자 사용자 목록에 모두 표시됨.

INSERT INTO public.profiles (id, email, display_name, phone, role, subscription_plan, onboarding_done)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name'),
  u.raw_user_meta_data->>'phone',
  'subscriber',
  'free',
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
