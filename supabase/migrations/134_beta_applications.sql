-- 베타 테스터 지원서: 공개 제출은 API(service role)로만 저장. 관리자 SELECT.

CREATE TABLE IF NOT EXISTS public.beta_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applicant_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  phone TEXT NOT NULL,
  industry TEXT NOT NULL,
  employee_band TEXT NOT NULL,
  record_management TEXT NOT NULL,
  pain_experiences TEXT[] NOT NULL DEFAULT '{}',
  dispute_last_year TEXT NOT NULL,
  desired_features TEXT[] NOT NULL DEFAULT '{}',
  biggest_pain TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL,
  consent_personal BOOLEAN NOT NULL DEFAULT FALSE,
  pain_score INT NOT NULL DEFAULT 0,
  source_path TEXT DEFAULT '/beta'
);

COMMENT ON TABLE public.beta_applications IS '클린아이덱스 베타 테스터 지원 원시 응답. INSERT는 서비스 롤(API)만.';
COMMENT ON COLUMN public.beta_applications.pain_score IS '서버에서 계산한 우선 연락용 가중치(휴리스틱).';

CREATE INDEX IF NOT EXISTS idx_beta_applications_created ON public.beta_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_applications_pain ON public.beta_applications (pain_score DESC, created_at DESC);

ALTER TABLE public.beta_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_applications_select_admin" ON public.beta_applications;
CREATE POLICY "beta_applications_select_admin" ON public.beta_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );
