-- 입주레이더 광고: 이미지 안전 영역(정규화 0~1) — 허브 3:1 와이드 배너 크롭용

ALTER TABLE public.radar_ad_slots
  ADD COLUMN IF NOT EXISTS image_crop_x REAL NOT NULL DEFAULT 0.1
    CHECK (image_crop_x >= 0 AND image_crop_x <= 1),
  ADD COLUMN IF NOT EXISTS image_crop_y REAL NOT NULL DEFAULT 0.1
    CHECK (image_crop_y >= 0 AND image_crop_y <= 1),
  ADD COLUMN IF NOT EXISTS image_crop_w REAL NOT NULL DEFAULT 0.8
    CHECK (image_crop_w > 0 AND image_crop_w <= 1),
  ADD COLUMN IF NOT EXISTS image_crop_h REAL NOT NULL DEFAULT 0.8
    CHECK (image_crop_h > 0 AND image_crop_h <= 1);

COMMENT ON COLUMN public.radar_ad_slots.image_crop_x IS '노출 크롭 좌상단 X (0~1)';
COMMENT ON COLUMN public.radar_ad_slots.image_crop_y IS '노출 크롭 좌상단 Y (0~1)';
COMMENT ON COLUMN public.radar_ad_slots.image_crop_w IS '노출 크롭 너비 (0~1)';
COMMENT ON COLUMN public.radar_ad_slots.image_crop_h IS '노출 크롭 높이 (0~1)';
