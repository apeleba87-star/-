-- 인력 구인 매칭 시스템: 지원·확정·비공개 정보·완료 집계·신고
-- 1) worker_profiles, company_profiles
-- 2) job_post_private_details (확정자에게만 공개)
-- 3) job_post_positions 확장 (work_period, start_time, end_time)
-- 4) job_applications (지원 → 확정/거절/취소)
-- 5) completed_job_assignments (완료 매칭 원장, 단가 집계용)
-- 6) job_reports (신고, 상호 협의 시 rescinded)
-- 7) filled_count 동기화 트리거

-- ========== 1. 작업자 프로필 (확정 전 최소 정보, 확정 후 이름·연락처) ==========
CREATE TABLE IF NOT EXISTS public.worker_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  real_name TEXT,
  birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2100)),
  gender TEXT CHECK (gender IS NULL OR gender IN ('M', 'F', 'other', '')),
  bio TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_profiles_nickname ON worker_profiles(nickname);

-- ========== 2. 업체 프로필 ==========
CREATE TABLE IF NOT EXISTS public.company_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  description TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 3. 구인글 비공개 상세 (확정된 지원자에게만 노출) ==========
CREATE TABLE IF NOT EXISTS public.job_post_private_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE UNIQUE,
  full_address TEXT,
  contact_phone TEXT,
  access_instructions TEXT,
  parking_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_post_private_details_job ON job_post_private_details(job_post_id);

-- ========== 4. job_post_positions 확장: work_period(반당 오전/오후), 작업 시간대(충돌 체크용) ==========
ALTER TABLE public.job_post_positions
  ADD COLUMN IF NOT EXISTS work_period TEXT CHECK (work_period IS NULL OR work_period IN ('am', 'pm')),
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

COMMENT ON COLUMN public.job_post_positions.work_period IS '반당(half_day)일 때만: am 오전, pm 오후';
COMMENT ON COLUMN public.job_post_positions.start_time IS '작업 시작 시각, 충돌 체크 및 야간(자정 넘김) 지원';
COMMENT ON COLUMN public.job_post_positions.end_time IS '작업 종료 시각, end_time < start_time 이면 익일 새벽';

-- ========== 5. 지원 ==========
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.job_post_positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN (
    'applied', 'reviewing', 'accepted', 'rejected', 'cancelled', 'no_show_reported'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(position_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

-- ========== 6. 완료 매칭 원장 (단가 집계용, 확정 시점에 1건 삽입) ==========
CREATE TABLE IF NOT EXISTS public.completed_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE UNIQUE,
  position_id UUID NOT NULL REFERENCES public.job_post_positions(id) ON DELETE CASCADE,
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  category_main_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  category_sub_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  pay_unit TEXT NOT NULL CHECK (pay_unit IN ('day', 'half_day', 'hour')),
  pay_amount NUMERIC NOT NULL,
  normalized_daily_wage NUMERIC,
  work_date DATE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completed_job_assignments_region ON completed_job_assignments(region, district);
CREATE INDEX IF NOT EXISTS idx_completed_job_assignments_category ON completed_job_assignments(category_main_id, category_sub_id);
CREATE INDEX IF NOT EXISTS idx_completed_job_assignments_pay_unit ON completed_job_assignments(pay_unit);
CREATE INDEX IF NOT EXISTS idx_completed_job_assignments_completed_at ON completed_job_assignments(completed_at DESC);

-- ========== 7. 신고 (무단 결근, 일당 미지급, 기타 + 자유 텍스트, 상호 협의 시 rescinded) ==========
CREATE TABLE IF NOT EXISTS public.job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('no_show', 'unpaid', 'other')),
  reason_text TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rescinded')),
  rescinded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_reports_reported_user ON job_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_job_reports_created ON job_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_reports_status ON job_reports(status);

-- ========== 8. filled_count 동기화: job_applications.status = accepted 개수로 반영 ==========
CREATE OR REPLACE FUNCTION public.sync_position_filled_count()
RETURNS TRIGGER AS $$
DECLARE
  pos_id UUID;
  cnt INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    pos_id := OLD.position_id;
  ELSE
    pos_id := NEW.position_id;
  END IF;

  SELECT COUNT(*)::INT INTO cnt
  FROM job_applications
  WHERE position_id = pos_id AND status = 'accepted';

  UPDATE job_post_positions
  SET filled_count = cnt, updated_at = NOW()
  WHERE id = pos_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_position_filled_count_trigger ON job_applications;
CREATE TRIGGER sync_position_filled_count_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_position_filled_count();

-- 기존 데이터: 수동 충원 제거에 따라 filled_count는 트리거로만 갱신됨. 기존 값은 0으로 리셋 (신규 지원/확정부터 반영)
UPDATE job_post_positions SET filled_count = 0 WHERE filled_count > 0;

-- ========== 9. RLS ==========
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_post_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;

-- worker_profiles: 본인만 수정, 읽기는 인증 사용자(지원자 목록에서 최소 정보용)
CREATE POLICY "worker_profiles_select" ON worker_profiles FOR SELECT USING (true);
CREATE POLICY "worker_profiles_insert" ON worker_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "worker_profiles_update" ON worker_profiles FOR UPDATE USING (auth.uid() = user_id);

-- company_profiles: 본인만 수정, 읽기 전체
CREATE POLICY "company_profiles_select" ON company_profiles FOR SELECT USING (true);
CREATE POLICY "company_profiles_insert" ON company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "company_profiles_update" ON company_profiles FOR UPDATE USING (auth.uid() = user_id);

-- job_post_private_details: 구인글 작성자만 수정; 읽기는 해당 글에 accepted인 지원자만
CREATE POLICY "job_post_private_details_select_owner" ON job_post_private_details FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM job_applications a
      JOIN job_post_positions p ON p.id = a.position_id
      WHERE p.job_post_id = job_post_private_details.job_post_id
        AND a.user_id = auth.uid() AND a.status = 'accepted'
    )
  );
CREATE POLICY "job_post_private_details_all_owner" ON job_post_private_details FOR ALL
  USING (EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid()));

-- job_applications: 지원자는 본인 지원만, 구인자는 해당 글의 지원만
CREATE POLICY "job_applications_select" ON job_applications FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM job_post_positions p
      JOIN job_posts j ON j.id = p.job_post_id
      WHERE p.id = position_id AND j.user_id = auth.uid()
    )
  );
CREATE POLICY "job_applications_insert" ON job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "job_applications_update" ON job_applications FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM job_post_positions p
      JOIN job_posts j ON j.id = p.job_post_id
      WHERE p.id = position_id AND j.user_id = auth.uid()
    )
  );

-- completed_job_assignments: 구인글 작성자가 확정 시 삽입/취소 시 삭제, 읽기 전체
CREATE POLICY "completed_job_assignments_select" ON completed_job_assignments FOR SELECT USING (true);
CREATE POLICY "completed_job_assignments_insert" ON completed_job_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid()));
CREATE POLICY "completed_job_assignments_delete" ON completed_job_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid()));

-- job_reports: 신고자·피신고자·관리자만 접근 (관리자 정책은 별도)
CREATE POLICY "job_reports_select_own" ON job_reports FOR SELECT
  USING (auth.uid() = reporter_id OR auth.uid() = reported_user_id);
CREATE POLICY "job_reports_insert" ON job_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "job_reports_update_own" ON job_reports FOR UPDATE
  USING (auth.uid() = reporter_id OR auth.uid() = reported_user_id);
