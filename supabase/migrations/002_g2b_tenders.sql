-- 나라장터(G2B) 입찰·계약 MVP 테이블
-- 공공데이터포털 입찰공고정보서비스·계약정보서비스 연동

-- 청소업 키워드 사전 (관리자에서 수정 가능)
CREATE TABLE IF NOT EXISTS public.tender_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tender_keywords (keyword, sort_order) VALUES
  ('청소', 1), ('미화', 2), ('위생', 3), ('시설관리', 4), ('환경미화', 5),
  ('건물청소', 6), ('소독', 7), ('방역', 8), ('용역청소', 9)
ON CONFLICT (keyword) DO NOTHING;

-- 입찰 공고 기본 (목록 필드)
CREATE TABLE IF NOT EXISTS public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_ntce_no TEXT NOT NULL,
  bid_ntce_ord TEXT NOT NULL DEFAULT '00',
  bid_ntce_nm TEXT,
  bid_ntce_dt TIMESTAMPTZ,
  bid_clse_dt TIMESTAMPTZ,
  openg_dt TIMESTAMPTZ,
  ntce_instt_nm TEXT,
  dmand_instt_nm TEXT,
  cntrct_mthd_nm TEXT,
  srvce_div_nm TEXT,
  prcure_obj_nm TEXT,
  bsns_dstr_nm TEXT,
  base_amt BIGINT,
  estmt_amt BIGINT,
  ntce_url TEXT,
  raw JSONB,
  keywords_matched TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bid_ntce_no, bid_ntce_ord)
);

CREATE INDEX IF NOT EXISTS idx_tenders_clse_dt ON tenders(bid_clse_dt);
CREATE INDEX IF NOT EXISTS idx_tenders_ntce_dt ON tenders(bid_ntce_dt);
CREATE INDEX IF NOT EXISTS idx_tenders_instt ON tenders(ntce_instt_nm);
CREATE INDEX IF NOT EXISTS idx_tenders_created ON tenders(created_at DESC);

-- 공고 상세 (자격요건, 기초금액, 첨부 요약)
CREATE TABLE IF NOT EXISTS public.tender_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  qual_req_summary TEXT,
  base_amt_detail JSONB,
  attach_files JSONB,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tender_id)
);

-- 참가가능지역
CREATE TABLE IF NOT EXISTS public.tender_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  region_code TEXT,
  region_nm TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tender_id, region_code)
);

-- 면허/업종 제한
CREATE TABLE IF NOT EXISTS public.tender_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  license_nm TEXT,
  license_detail TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_licenses_tender ON tender_licenses(tender_id);

-- 변경이력
CREATE TABLE IF NOT EXISTS public.tender_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  chg_dt TIMESTAMPTZ,
  chg_summary TEXT,
  raw JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_changes_tender ON tender_changes(tender_id);

-- 수집 체크포인트 (날짜 구간별 마지막 수집 시각)
CREATE TABLE IF NOT EXISTS public.g2b_fetch_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  inqry_bgn_dt DATE NOT NULL,
  inqry_end_dt DATE NOT NULL,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(operation, inqry_bgn_dt, inqry_end_dt)
);

-- 계약 (계약정보서비스)
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no TEXT,
  contract_dt DATE,
  contract_amt BIGINT,
  cntrct_instt_nm TEXT,
  dmand_instt_nm TEXT,
  contractor_nm TEXT,
  bid_ntce_no TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_dt ON contracts(contract_dt DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_instt ON contracts(cntrct_instt_nm);

-- 스크랩(즐겨찾기)
CREATE TABLE IF NOT EXISTS public.user_saved_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tender_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_tenders_user ON user_saved_tenders(user_id);

-- RLS
ALTER TABLE tender_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE g2b_fetch_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tender_keywords_read" ON tender_keywords FOR SELECT USING (true);
CREATE POLICY "tenders_read" ON tenders FOR SELECT USING (true);
CREATE POLICY "tender_details_read" ON tender_details FOR SELECT USING (true);
CREATE POLICY "tender_regions_read" ON tender_regions FOR SELECT USING (true);
CREATE POLICY "tender_licenses_read" ON tender_licenses FOR SELECT USING (true);
CREATE POLICY "tender_changes_read" ON tender_changes FOR SELECT USING (true);
CREATE POLICY "contracts_read" ON contracts FOR SELECT USING (true);

CREATE POLICY "user_saved_tenders_own" ON user_saved_tenders FOR ALL USING (auth.uid() = user_id);

-- 관리자: 키워드·체크포인트 수정
CREATE POLICY "admin_keywords" ON tender_keywords FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_checkpoints" ON g2b_fetch_checkpoints FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- 크론/서버 전용: tenders 등 insert (service role 또는 anon + RLS로 허용하지 않으면 API 라우트에서 서버로 insert)
CREATE POLICY "tenders_insert" ON tenders FOR INSERT WITH CHECK (true);
CREATE POLICY "tenders_update" ON tenders FOR UPDATE USING (true);
CREATE POLICY "tender_details_all" ON tender_details FOR ALL USING (true);
CREATE POLICY "contracts_insert" ON contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "contracts_update" ON contracts FOR UPDATE USING (true);
