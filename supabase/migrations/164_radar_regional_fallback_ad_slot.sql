-- 입주레이더 지역 직거래 없을 때 제휴·스크립트 광고 (애드센스/쿠팡 등)

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'radar_regional_fallback',
    '입주레이더 · 지역 광고 대체 (직거래 없을 때)',
    false,
    'google'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
