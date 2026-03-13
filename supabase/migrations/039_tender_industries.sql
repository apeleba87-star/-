-- 업종 기반 필터: industries 마스터 + tender_industries 다대다 (한 공고에 여러 업종)
-- categories는 fallback으로 유지

-- 1. industries 테이블
CREATE TABLE IF NOT EXISTS public.industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_key TEXT,
  aliases TEXT[] DEFAULT '{}',
  notes TEXT,
  source TEXT DEFAULT 'manual',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industries_active ON industries(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_industries_code ON industries(code);
CREATE INDEX IF NOT EXISTS idx_industries_group ON industries(group_key) WHERE group_key IS NOT NULL;

COMMENT ON TABLE industries IS '입찰 공고 필터용 업종 마스터. 관리자 CRUD.';
COMMENT ON COLUMN industries.aliases IS '이름 변형(건물위생관리 등) 매칭용';

-- 2. tender_industries 매핑 (다대다)
CREATE TABLE IF NOT EXISTS public.tender_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  industry_code TEXT NOT NULL REFERENCES public.industries(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tender_id, industry_code)
);

CREATE INDEX IF NOT EXISTS idx_tender_industries_tender ON tender_industries(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_industries_code ON tender_industries(industry_code);

-- 3. tenders 목록 표시용 대표 업종 1개 (선택)
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS primary_industry_code TEXT REFERENCES public.industries(code) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenders_primary_industry ON tenders(primary_industry_code) WHERE primary_industry_code IS NOT NULL;

-- 4. 지역 파싱 캐시 (나중에 백필/수집 시 채움)
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS region_sido_list TEXT[] DEFAULT '{}';

COMMENT ON COLUMN tenders.primary_industry_code IS '목록 카드용 대표 업종 1개';
COMMENT ON COLUMN tenders.region_sido_list IS 'bsns_dstr_nm 파싱 결과 캐시 (서울, 경기 등)';

-- 5. 초기 업종 데이터 (건물위생관리업, 소독업 등)
INSERT INTO public.industries (code, name, group_key, aliases, sort_order, source) VALUES
  ('building_sanitation', '건물위생관리업', 'cleaning', ARRAY['건물위생관리', '위생관리업', '건물위생'], 1, 'manual'),
  ('disinfection', '소독업', 'disinfection', ARRAY['소독', '방역', '소독업'], 2, 'manual'),
  ('facility_security', '시설경비업', 'facility', ARRAY['시설경비', '경비업'], 3, 'manual')
ON CONFLICT (code) DO NOTHING;

-- 6. RLS
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "industries_read" ON industries FOR SELECT USING (true);
CREATE POLICY "industries_admin" ON industries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));

CREATE POLICY "tender_industries_read" ON tender_industries FOR SELECT USING (true);
CREATE POLICY "tender_industries_insert" ON tender_industries FOR INSERT WITH CHECK (true);
CREATE POLICY "tender_industries_update" ON tender_industries FOR UPDATE USING (true);
CREATE POLICY "tender_industries_delete" ON tender_industries FOR DELETE USING (true);
