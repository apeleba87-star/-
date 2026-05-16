-- 구 홈 레이아웃(Hero 직후·뉴스–현장공유 사이) 폐지에 따른 슬롯 제거

DELETE FROM public.coupang_ad_cache
WHERE slot_key IN ('premium_banner', 'native_card');

DELETE FROM public.home_ad_slots
WHERE key IN ('premium_banner', 'native_card');

UPDATE public.home_ad_slots
SET name = '홈 하단'
WHERE key = 'home_bottom';
