-- 낙찰공고 목록: 업종 필터(전체 제외) 시 2~3번째 공고 사이

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'awards_industry_list_3rd',
    '낙찰공고 목록 · 업종 필터 시 2~3번째 사이',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
