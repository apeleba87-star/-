-- 입찰 리포트 인라인 슬롯 2개만 유지, 나머지 광고 슬롯 제거

DELETE FROM public.coupang_ad_cache
WHERE slot_key NOT IN (
  'tender_report_budget_below',
  'tender_report_premium_core_below'
);

DELETE FROM public.home_ad_slots
WHERE key NOT IN (
  'tender_report_budget_below',
  'tender_report_premium_core_below'
);
