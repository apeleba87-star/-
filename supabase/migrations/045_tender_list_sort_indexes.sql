-- 리스트 정렬·커서 페이지네이션 대비: 정렬 컬럼 + id 복합 인덱스
-- (첫 페이지만 offset 가능, 이후 cursor 시 인덱스로 안정적 스캔)

-- 입찰 마감임박순: bid_clse_dt ASC, id
CREATE INDEX IF NOT EXISTS idx_tenders_bid_clse_dt_id
  ON tenders(bid_clse_dt ASC NULLS LAST, id);

-- 입찰 공고일순: bid_ntce_dt DESC, id
CREATE INDEX IF NOT EXISTS idx_tenders_bid_ntce_dt_id
  ON tenders(bid_ntce_dt DESC NULLS LAST, id);

-- 입찰 예산순: base_amt DESC, id (정렬 시 nulls 처리 일치)
CREATE INDEX IF NOT EXISTS idx_tenders_base_amt_id
  ON tenders(base_amt DESC NULLS LAST, id);
