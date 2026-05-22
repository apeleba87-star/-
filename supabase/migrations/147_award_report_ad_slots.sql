-- 낙찰 리포트: 핵심 지표 아래 · 낙찰 공고 상위 위

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'award_report_key_metrics_below',
    '낙찰 리포트 · 핵심 지표 아래',
    true,
    'coupang'
  ),
  (
    'award_report_top_awards_above',
    '낙찰 리포트 · 낙찰 공고 상위 위',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
