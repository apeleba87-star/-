-- 조달청/나라장터 업종 코드로 통일 (기존 building_sanitation 등 → 숫자 코드)
-- 1162 건물위생관리업, 1164 시설경비업, 1260 건물(시설)관리용역업, 1173 저수조청소업,
-- 1192 소독업, 1172 근로자파견사업, 1136 분뇨수집·운반업, 5527 유창청소업

-- 1. 참조를 새 코드로 변경 (기존 slug → 공식 코드)
UPDATE public.tender_industries SET industry_code = '1162' WHERE industry_code = 'building_sanitation';
UPDATE public.tender_industries SET industry_code = '1192' WHERE industry_code = 'disinfection';
UPDATE public.tender_industries SET industry_code = '1164' WHERE industry_code = 'facility_security';

UPDATE public.tenders SET primary_industry_code = '1162' WHERE primary_industry_code = 'building_sanitation';
UPDATE public.tenders SET primary_industry_code = '1192' WHERE primary_industry_code = 'disinfection';
UPDATE public.tenders SET primary_industry_code = '1164' WHERE primary_industry_code = 'facility_security';

-- 2. 기존 업종 행 삭제
DELETE FROM public.industries WHERE code IN ('building_sanitation', 'disinfection', 'facility_security');

-- 3. 공식 업종 코드로 전부 INSERT
INSERT INTO public.industries (code, name, group_key, aliases, sort_order, source, is_active) VALUES
  ('1162', '건물위생관리업', 'cleaning', ARRAY['건물위생관리', '위생관리업', '건물위생'], 1, 'manual', true),
  ('1164', '시설경비업', 'facility', ARRAY['시설경비', '경비업'], 2, 'manual', true),
  ('1260', '건물(시설)관리용역업', 'facility', ARRAY['건물관리용역', '시설관리용역'], 3, 'manual', true),
  ('1173', '저수조청소업', 'cleaning', ARRAY['저수조청소'], 4, 'manual', true),
  ('1192', '소독업', 'disinfection', ARRAY['소독', '방역', '소독업'], 5, 'manual', true),
  ('1172', '근로자파견사업', 'labor', ARRAY['근로자파견'], 6, 'manual', true),
  ('1136', '분뇨수집·운반업', 'cleaning', ARRAY['분뇨수집', '분뇨운반'], 7, 'manual', true),
  ('5527', '유창청소업', 'cleaning', ARRAY['유창청소', '유리창청소'], 8, 'manual', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  group_key = EXCLUDED.group_key,
  aliases = EXCLUDED.aliases,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
