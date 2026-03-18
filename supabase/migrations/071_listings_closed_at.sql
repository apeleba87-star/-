-- 현장거래 유동성 지표용: 거래 완료 시점. 평균 판매 기간 등 집계에 사용.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.listings.closed_at IS '거래 마감/완료 시점. 유동성 리포트(평균 판매 기간) 집계용. status=closed 시 설정 권장';
