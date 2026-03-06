-- 인력구인 개선: 현장 1개 = job_posts 1건, 그 안에 여러 포지션 = job_post_positions
-- 포지션별 인원·일당·카테고리·평균 비교·마감 상태 관리

-- 1. 상위: 현장 공통 정보
CREATE TABLE IF NOT EXISTS public.job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  region TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  work_date DATE,
  start_time TIME,
  end_time TIME,
  description TEXT,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_posts_user ON job_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_work_date ON job_posts(work_date);
CREATE INDEX IF NOT EXISTS idx_job_posts_region ON job_posts(region);
CREATE INDEX IF NOT EXISTS idx_job_posts_created ON job_posts(created_at DESC);

-- 2. 하위: 구인 포지션 (포지션별 인원·일당·카테고리·마감)
CREATE TABLE IF NOT EXISTS public.job_post_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  category_main_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  category_sub_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  custom_subcategory_text TEXT,
  skill_level TEXT,
  pay_amount NUMERIC NOT NULL,
  pay_unit TEXT NOT NULL CHECK (pay_unit IN ('day', 'half_day', 'hour')),
  normalized_daily_wage NUMERIC,
  required_count INT NOT NULL DEFAULT 1 CHECK (required_count >= 1),
  filled_count INT NOT NULL DEFAULT 0 CHECK (filled_count >= 0),
  work_scope TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'closed')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_post_positions_job ON job_post_positions(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_post_positions_category ON job_post_positions(category_main_id, category_sub_id);

-- normalized_daily_wage 자동 계산
CREATE OR REPLACE FUNCTION public.job_post_positions_normalize_wage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pay_unit = 'day' THEN
    NEW.normalized_daily_wage := NEW.pay_amount;
  ELSIF NEW.pay_unit = 'half_day' THEN
    NEW.normalized_daily_wage := NEW.pay_amount * 2;
  ELSIF NEW.pay_unit = 'hour' THEN
    NEW.normalized_daily_wage := NEW.pay_amount * 8;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_post_positions_normalize_wage_trigger ON job_post_positions;
CREATE TRIGGER job_post_positions_normalize_wage_trigger
  BEFORE INSERT OR UPDATE OF pay_amount, pay_unit ON job_post_positions
  FOR EACH ROW EXECUTE FUNCTION public.job_post_positions_normalize_wage();

-- 포지션 status 자동 갱신 (filled_count 변경 시)
CREATE OR REPLACE FUNCTION public.job_post_positions_update_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.filled_count >= NEW.required_count THEN
    NEW.status := 'closed';
  ELSIF NEW.filled_count > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_post_positions_update_status_trigger ON job_post_positions;
CREATE TRIGGER job_post_positions_update_status_trigger
  BEFORE INSERT OR UPDATE OF filled_count, required_count ON job_post_positions
  FOR EACH ROW EXECUTE FUNCTION public.job_post_positions_update_status();

-- RLS
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_post_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_posts_read" ON job_posts FOR SELECT USING (true);
CREATE POLICY "job_posts_insert" ON job_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "job_posts_update" ON job_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "job_post_positions_read" ON job_post_positions FOR SELECT USING (true);
CREATE POLICY "job_post_positions_insert" ON job_post_positions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid()));
CREATE POLICY "job_post_positions_update" ON job_post_positions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM job_posts j WHERE j.id = job_post_id AND j.user_id = auth.uid()));
