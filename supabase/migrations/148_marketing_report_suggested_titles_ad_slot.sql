-- 마케팅 리포트: 추천 제목 1번·2번 카드 사이

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'marketing_report_suggested_titles_1_2',
    '마케팅 리포트 · 추천 제목 1~2번 사이',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
