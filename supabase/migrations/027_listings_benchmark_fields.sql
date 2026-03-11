-- 현장거래 평균/중앙값 참고값용: listings 확장 (유형별 금액·선택 조건)
-- 금액 상한은 별도 정책 확정 후 적용

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deal_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC,
  ADD COLUMN IF NOT EXISTS visits_per_week INT CHECK (visits_per_week IS NULL OR (visits_per_week >= 1 AND visits_per_week <= 7)),
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('easy', 'normal', 'hard'));

CREATE INDEX IF NOT EXISTS idx_listings_monthly_amount ON listings(monthly_amount) WHERE monthly_amount IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_listing_type_region ON listings(listing_type, region);

COMMENT ON COLUMN public.listings.monthly_amount IS '월 수금(매매) 또는 월 도급금(도급). 정기소개는 미사용.';
COMMENT ON COLUMN public.listings.deal_amount IS '성사 금액(소개) 또는 매매가(매매). 도급은 미사용.';
COMMENT ON COLUMN public.listings.area_pyeong IS '평수. 선택 입력. 집계 시 평수대(구간)로 사용.';
COMMENT ON COLUMN public.listings.visits_per_week IS '주 회수 1~7. 선택 입력.';
COMMENT ON COLUMN public.listings.difficulty IS '난이도 easy/normal/hard. 선택 입력.';
