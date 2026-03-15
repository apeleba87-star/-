-- 특정 계정(apeleba2@naver.com)의 관리자 역할 복구
-- 별명(display_name) "관리자"와 시스템 권한(role)은 별개이며, 메뉴/접근은 role 기준임.
-- 트리거(role 변경 차단)가 있으므로, 트리거를 잠시 끄고 UPDATE 후 복구.

DROP TRIGGER IF EXISTS profiles_prevent_role_update_trigger ON public.profiles;

UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'apeleba2@naver.com'
  AND role != 'admin';

CREATE TRIGGER profiles_prevent_role_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.profiles_prevent_role_update();
