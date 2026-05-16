-- 리포트 무료화 이후 광고 슬롯 확장 + 직접 수주 실패 시 쿠팡/구글 fallback

ALTER TABLE public.home_ad_slots
  ADD COLUMN IF NOT EXISTS fallback_type TEXT
    CHECK (fallback_type IS NULL OR fallback_type IN ('google', 'coupang')),
  ADD COLUMN IF NOT EXISTS fallback_script_content TEXT;

COMMENT ON COLUMN public.home_ad_slots.fallback_type IS 'slot_type=direct 이고 활성 캠페인 없을 때 사용할 스크립트 유형';
COMMENT ON COLUMN public.home_ad_slots.fallback_script_content IS 'fallback_type용 HTML/스크립트';

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  ('awards_top', '낙찰 목록 상단', true, 'coupang'),
  ('awards_mid', '낙찰 목록 중간', true, 'coupang'),
  ('tender_detail_top', '입찰 상세 상단', true, 'coupang'),
  ('tender_detail_bottom', '입찰 상세 하단', true, 'coupang'),
  ('report_top', '리포트(일당·마케팅) 상단', true, 'coupang'),
  ('report_bottom', '리포트(일당·마케팅) 하단', true, 'coupang')
ON CONFLICT (key) DO NOTHING;
