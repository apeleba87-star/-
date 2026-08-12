-- 전후 사진 프레임 내 초점 위치 (object-position %, 0–100)

ALTER TABLE public.knowledge_media
  ADD COLUMN IF NOT EXISTS focal_x real NOT NULL DEFAULT 50
    CHECK (focal_x >= 0 AND focal_x <= 100);

ALTER TABLE public.knowledge_media
  ADD COLUMN IF NOT EXISTS focal_y real NOT NULL DEFAULT 50
    CHECK (focal_y >= 0 AND focal_y <= 100);
