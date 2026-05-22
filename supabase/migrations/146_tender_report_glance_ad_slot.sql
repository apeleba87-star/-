-- 입찰 리포트: 오늘 한눈에 카드 아래

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'tender_report_glance_below',
    '입찰 리포트 · 오늘 한눈에 아래',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
