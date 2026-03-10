-- ON CONFLICT (bid_ntce_no, bid_ntce_ord) 사용을 위해 유니크 인덱스 보장
-- 기존 002에서 UNIQUE(bid_ntce_no, bid_ntce_ord)가 있으나, DB에 따라 없을 수 있으므로 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenders_bid_ntce_no_ord_uniq
  ON public.tenders (bid_ntce_no, bid_ntce_ord);
