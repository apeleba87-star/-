-- 마감된 입찰 공고 삭제 전, 과거 입찰 "몇 건"만 보관하는 최소 집계 테이블.
-- 일별·주별 건수(·예산 합계) 저장 후 tenders에서 마감 건 삭제 시 사용.

CREATE TABLE IF NOT EXISTS public.tender_period_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stats_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'day',
  closed_count INT NOT NULL DEFAULT 0,
  budget_total BIGINT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stats_date, period_type)
);

CREATE INDEX IF NOT EXISTS idx_tender_period_stats_date ON tender_period_stats(stats_date DESC);
CREATE INDEX IF NOT EXISTS idx_tender_period_stats_type ON tender_period_stats(period_type);

COMMENT ON TABLE tender_period_stats IS '마감 입찰 최소 집계: 일별/주별 건수·예산 합계 (공고 삭제 후에도 "몇 건" 유지)';
COMMENT ON COLUMN tender_period_stats.period_type IS 'day | week';
COMMENT ON COLUMN tender_period_stats.closed_count IS '해당 일/주에 마감된 공고 건수';
COMMENT ON COLUMN tender_period_stats.budget_total IS '해당 일/주 마감 공고 예산 합계(선택)';

ALTER TABLE tender_period_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tender_period_stats_read" ON tender_period_stats FOR SELECT USING (true);
