-- 입찰 목록: 업종 필터(전체 제외) 시 진행 중 공고 3번째 위치

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'tenders_industry_open_3rd',
    '입찰 목록 · 업종 필터 시 진행 중 3번째',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
