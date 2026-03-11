-- 계단 청소 전용: 평수 대신 층수·옵션 기준 저장 (견적계산기와 동일 구조)

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS stairs_floors INT CHECK (stairs_floors IS NULL OR (stairs_floors >= 1 AND stairs_floors <= 99)),
  ADD COLUMN IF NOT EXISTS stairs_restroom_count INT CHECK (stairs_restroom_count IS NULL OR stairs_restroom_count >= 0),
  ADD COLUMN IF NOT EXISTS stairs_has_recycle BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_has_corridor BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_elevator BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_parking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stairs_window BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.stairs_floors IS '계단 청소: 층수. 계단청소일 때만 사용.';
COMMENT ON COLUMN public.listings.stairs_restroom_count IS '계단 청소: 화장실 개수.';
COMMENT ON COLUMN public.listings.stairs_has_recycle IS '계단 청소: 분리수거 유무.';
COMMENT ON COLUMN public.listings.stairs_has_corridor IS '계단 청소: 복도 청소 유무.';
COMMENT ON COLUMN public.listings.stairs_elevator IS '계단 청소: 엘리베이터 청소 유무.';
COMMENT ON COLUMN public.listings.stairs_parking IS '계단 청소: 주차장 청소 유무.';
COMMENT ON COLUMN public.listings.stairs_window IS '계단 청소: 창틀 먼지 청소 유무.';
