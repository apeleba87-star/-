-- profiles.role 변경 차단: admin/editor 부여는 DB·시드·관리 도구에서만
-- 클라이언트·API 직접 UPDATE로 권한 상승 불가

CREATE OR REPLACE FUNCTION public.profiles_prevent_role_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role 변경은 허용되지 않습니다. 관리자 부여는 DB/시드에서만 가능합니다.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_update_trigger ON public.profiles;
CREATE TRIGGER profiles_prevent_role_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.profiles_prevent_role_update();

COMMENT ON FUNCTION public.profiles_prevent_role_update() IS '권한 상승 방지: profiles.role은 트리거로 변경 차단, admin/editor는 마이그레이션·시드에서만 설정';
