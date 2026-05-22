-- 입찰 상세: 입찰 전략 가격 카드 아래

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'tender_detail_strategy_below',
    '입찰 상세 · 입찰 전략 가격 아래',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
