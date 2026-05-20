-- 워크넷(고용24) 채용정보: 정규화·스냅샷·공개 읽기

CREATE TABLE IF NOT EXISTS public.public_job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL,
  source_record_id text NOT NULL,
  wanted_auth_no text NOT NULL,
  title text NOT NULL DEFAULT '',
  company text,
  industry_name text,
  preset_key text,
  preset_label text,
  region_text text,
  region_sido text,
  region_sigungu text,
  sal_tp_cd text,
  sal_tp_nm text,
  pay_min_won bigint,
  pay_max_won bigint,
  pay_monthly_normalized bigint,
  pay_display text NOT NULL DEFAULT '급여 협의',
  is_pay_negotiable boolean NOT NULL DEFAULT true,
  holiday_label text,
  career_label text,
  reg_at timestamptz,
  closing_at timestamptz,
  is_open boolean NOT NULL DEFAULT true,
  external_url text NOT NULL,
  external_mobile_url text,
  detail_synced_at timestamptz,
  detail_payload jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_job_openings_source_unique UNIQUE (source_slug, source_record_id),
  CONSTRAINT public_job_openings_wanted_auth_unique UNIQUE (wanted_auth_no)
);

CREATE INDEX IF NOT EXISTS idx_public_job_openings_open_pay
  ON public.public_job_openings (is_open, pay_monthly_normalized DESC NULLS LAST)
  WHERE is_open = true;

CREATE INDEX IF NOT EXISTS idx_public_job_openings_open_region_pay
  ON public.public_job_openings (region_sido, region_sigungu, is_open, pay_monthly_normalized DESC NULLS LAST)
  WHERE is_open = true;

CREATE INDEX IF NOT EXISTS idx_public_job_openings_synced
  ON public.public_job_openings (last_synced_at DESC);

COMMENT ON TABLE public.public_job_openings IS
  '공공 API(워크넷 등) 정규화 채용. 청소·용역 필터 통과분만 노출.';

ALTER TABLE public.public_job_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_job_openings_select_anon"
  ON public.public_job_openings FOR SELECT
  TO anon, authenticated
  USING (is_open = true);

-- 스냅샷: Dual Spotlight용 사전 집계
CREATE TABLE IF NOT EXISTS public.job_spotlight_snapshots (
  scope_key text PRIMARY KEY,
  region_sido text,
  region_sigungu text,
  local_top_opening_id uuid REFERENCES public.public_job_openings (id) ON DELETE SET NULL,
  local_top_title text,
  local_top_pay_display text,
  local_top_preset_label text,
  local_top_closing_label text,
  pay_top_opening_id uuid REFERENCES public.public_job_openings (id) ON DELETE SET NULL,
  pay_top_title text,
  pay_top_pay_display text,
  pay_top_region_label text,
  pay_delta_won bigint,
  pay_delta_display text,
  opening_count_local int NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_spotlight_snapshots IS
  '지역·전국 급여/지역 TOP — cron 갱신(기본 12시간).';

ALTER TABLE public.job_spotlight_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_spotlight_snapshots_select_anon"
  ON public.job_spotlight_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);
