-- Supabase SQL Editor에서 직접 실행용: apeleba2@naver.com 관리자 역할 설정
-- 역할(role)은 Auth > Users가 아니라 Table Editor > profiles 에 있습니다.

-- 1) 현재 상태 확인 (실행 후 결과 확인)
SELECT id, email, role, updated_at
FROM public.profiles
WHERE email ILIKE '%apeleba2%';

-- 2) role 변경 트리거 잠시 제거 후 수정
DROP TRIGGER IF EXISTS profiles_prevent_role_update_trigger ON public.profiles;

UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'apeleba2@naver.com'
  AND (role IS NULL OR role != 'admin');

-- 3) 트리거 다시 생성 (034 마이그레이션과 동일)
CREATE TRIGGER profiles_prevent_role_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.profiles_prevent_role_update();

-- 4) 반영 결과 확인
SELECT id, email, role, updated_at
FROM public.profiles
WHERE email ILIKE '%apeleba2%';
