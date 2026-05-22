-- 입찰 공고 상세: 요약 카드(1번)와 진행·낙찰 상태 카드(2번) 사이

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'tender_detail_summary_below',
    '입찰 상세 · 요약 카드 아래 (진행 중 위)',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
