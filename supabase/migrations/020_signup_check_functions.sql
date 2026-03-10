-- 회원가입 시 이메일/닉네임 중복 확인용 함수 및 닉네임(display_name) 유일 제약

-- 이메일 중복 여부: 대소문자 무시 (profiles.email 기준)
CREATE OR REPLACE FUNCTION public.check_email_available(email_input TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(email_input))
      AND email IS NOT NULL AND TRIM(email) <> ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_email_available(TEXT) IS '가입 전 이메일 중복 확인';

-- 닉네임(display_name) 중복 여부: 대소문자·앞뒤 공백 무시, 비어 있지 않은 값만 조회
CREATE OR REPLACE FUNCTION public.check_display_name_available(name_input TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(TRIM(display_name)) = LOWER(TRIM(name_input))
      AND display_name IS NOT NULL
      AND TRIM(display_name) <> ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_display_name_available(TEXT) IS '가입 전 닉네임(display_name) 중복 확인';

-- 닉네임 유일: 동일한 표시명(대소문자 무시) 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_display_name_unique
  ON public.profiles (LOWER(TRIM(display_name)))
  WHERE display_name IS NOT NULL AND TRIM(display_name) <> '';
