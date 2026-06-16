-- 내 공고 마감 목록: user_id + status=closed, closed_at 정렬
CREATE INDEX IF NOT EXISTS idx_magam_listings_user_closed
  ON public.magam_listings (user_id, closed_at DESC NULLS LAST, created_at DESC)
  WHERE status = 'closed';
