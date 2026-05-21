-- 입찰 리포트(일간) 상세: 예산 상위 공고 아래 · 프리미엄 패널 당일 핵심 카드 아래
-- coupang_api: 본문 위치에 고정 (쿠팡 스크립트는 body 하단으로 붙는 문제 방지)

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type, coupang_config) VALUES
  (
    'tender_report_budget_below',
    '입찰 리포트 · 예산 상위 공고 아래',
    true,
    'coupang_api',
    '{"source":{"type":"search","keyword":"청소용품"},"limit":3,"subId":"tender_report_budget_below","imageSize":"512x512"}'::jsonb
  ),
  (
    'tender_report_premium_core_below',
    '입찰 리포트 · 프리미엄 당일 핵심 아래',
    true,
    'coupang_api',
    '{"source":{"type":"search","keyword":"청소용품"},"limit":3,"subId":"tender_report_premium_core_below","imageSize":"512x512"}'::jsonb
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  slot_type = EXCLUDED.slot_type,
  coupang_config = EXCLUDED.coupang_config;
