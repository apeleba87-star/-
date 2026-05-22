-- 견적 계산기: 내 견적 분석하기 버튼 아래

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'estimate_analyze_below',
    '견적 계산기 · 내 견적 분석하기 아래',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
