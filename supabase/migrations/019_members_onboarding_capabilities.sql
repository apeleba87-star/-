-- 회원 프로필 확장, 온보딩, 역량(capability) 테이블
-- 1) profiles: phone, onboarding_done
-- 2) handle_new_user: raw_user_meta_data에서 name, phone 반영
-- 3) member_capabilities
-- 4) worker_profiles / company_profiles 확장 컬럼

-- ========== 1. profiles 확장 ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.phone IS '가입 시 입력 휴대폰';
COMMENT ON COLUMN public.profiles.onboarding_done IS '활동 선택 온보딩 완료 여부';

-- ========== 2. handle_new_user: 가입 시 name, phone 저장 ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, phone, role, onboarding_done)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name'),
    NEW.raw_user_meta_data->>'phone',
    'subscriber',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 3. member_capabilities ==========
CREATE TABLE IF NOT EXISTS public.member_capabilities (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_apply_jobs BOOLEAN NOT NULL DEFAULT false,
  can_post_jobs BOOLEAN NOT NULL DEFAULT false,
  can_post_contracts BOOLEAN NOT NULL DEFAULT false,
  can_post_promotions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.member_capabilities IS '역할 기반 권한: 구인 지원/구인글 작성/도급·홍보';

ALTER TABLE public.member_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_capabilities_select_own" ON member_capabilities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "member_capabilities_insert_own" ON member_capabilities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_capabilities_update_own" ON member_capabilities
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== 4. worker_profiles 확장 ==========
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS career_years INT CHECK (career_years IS NULL OR career_years >= 0),
  ADD COLUMN IF NOT EXISTS main_job_types TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_region TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS completed_jobs INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_count INT NOT NULL DEFAULT 0;

-- ========== 5. company_profiles 확장 ==========
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS business_number TEXT,
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS service_region TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS verified_status TEXT;
