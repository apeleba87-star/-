ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.listings.is_private IS 'true면 공개 목록/공유 랜딩에서 비공개 안내로 처리';
COMMENT ON COLUMN public.listings.deleted_at IS '소프트 삭제 시각. 설정된 글은 공유 접근 시 삭제 안내';
COMMENT ON COLUMN public.listings.expires_at IS '만료 시각. 지난 글은 공유 접근 시 거래 종료 안내';

CREATE INDEX IF NOT EXISTS idx_listings_is_private_public
  ON public.listings (is_private)
  WHERE is_private = FALSE;

CREATE INDEX IF NOT EXISTS idx_listings_deleted_at
  ON public.listings (deleted_at);

CREATE INDEX IF NOT EXISTS idx_listings_expires_at
  ON public.listings (expires_at);
