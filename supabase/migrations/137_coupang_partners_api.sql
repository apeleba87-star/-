-- 쿠팡 파트너스 Open API: 슬롯별 상품 소스 설정 + 캐시

ALTER TABLE public.home_ad_slots
  DROP CONSTRAINT IF EXISTS home_ad_slots_slot_type_check;

ALTER TABLE public.home_ad_slots
  ADD CONSTRAINT home_ad_slots_slot_type_check
    CHECK (slot_type IN ('direct', 'google', 'coupang', 'coupang_api'));

ALTER TABLE public.home_ad_slots
  ADD COLUMN IF NOT EXISTS coupang_config JSONB;

COMMENT ON COLUMN public.home_ad_slots.coupang_config IS
  'slot_type=coupang_api 일 때 상품 소스: { source: { type, keyword|categoryId }, limit, subId?, imageSize? }';

CREATE TABLE IF NOT EXISTS public.coupang_ad_cache (
  slot_key TEXT PRIMARY KEY REFERENCES public.home_ad_slots(key) ON DELETE CASCADE,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetch_error TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coupang_ad_cache IS '쿠팡 파트너스 API 조회 결과 캐시 (크론 갱신)';

ALTER TABLE public.coupang_ad_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupang_ad_cache_public_read" ON public.coupang_ad_cache;
CREATE POLICY "coupang_ad_cache_public_read"
  ON public.coupang_ad_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "coupang_ad_cache_admin_all" ON public.coupang_ad_cache;
CREATE POLICY "coupang_ad_cache_admin_all"
  ON public.coupang_ad_cache FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
    )
  );
