-- 광고 슬롯 통합: 직접 수주 / 구글 / 쿠팡 구분, 스크립트 입력, 전역 슬롯 자리 추가

-- 1) home_ad_slots 컬럼 추가
ALTER TABLE public.home_ad_slots
  ADD COLUMN IF NOT EXISTS slot_type TEXT NOT NULL DEFAULT 'direct'
    CHECK (slot_type IN ('direct', 'google', 'coupang')),
  ADD COLUMN IF NOT EXISTS script_content TEXT;

COMMENT ON COLUMN public.home_ad_slots.slot_type IS 'direct: 직접 수주 캠페인 | google: 구글 광고 스크립트 | coupang: 쿠팡 스크립트';
COMMENT ON COLUMN public.home_ad_slots.script_content IS 'slot_type이 google 또는 coupang일 때 삽입할 HTML/스크립트';

-- 2) 새 슬롯 자리 추가 (홈 하단, 입찰 목록 상단/중간, 현장거래 목록 상단, 구인 목록 상단)
INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  ('home_bottom', '홈 하단 (입찰 섹션 아래)', true, 'direct'),
  ('tenders_top', '입찰 목록 상단', true, 'direct'),
  ('tenders_mid', '입찰 목록 중간', true, 'direct'),
  ('listings_top', '현장 거래 목록 상단', true, 'direct'),
  ('jobs_top', '인력 구인 목록 상단', true, 'direct')
ON CONFLICT (key) DO NOTHING;
