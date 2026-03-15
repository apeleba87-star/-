-- 조회용 요약 테이블: 홈 COUNT 실시간 제거, 쿼리 경량화
-- job_post_stats: 구인 오픈 건수 (홈 "인력 구인" 숫자)
-- listing_stats: 현장 거래 건수 (홈 "현장 거래" 숫자)
-- home_tender_stats: 등록 업종 기준 접수 중·오늘 공고·업종별·최근 5건 id (홈 입찰 영역)

-- 1) 구인 요약 (단일 행)
CREATE TABLE IF NOT EXISTS public.job_post_stats (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE job_post_stats IS '홈 대시보드용: status=open 이고 work_date>=오늘 또는 null 인 구인 건수';

-- 2) 현장 거래 요약 (단일 행)
CREATE TABLE IF NOT EXISTS public.listing_stats (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE listing_stats IS '홈 대시보드용: referral_regular, referral_one_time, sale_regular, subcontract 건수';

-- 3) 입찰 홈 요약 (단일 행, G2B 수집 완료 또는 크론에서 갱신)
CREATE TABLE IF NOT EXISTS public.home_tender_stats (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open_count INT NOT NULL DEFAULT 0,
  today_count INT NOT NULL DEFAULT 0,
  industry_breakdown JSONB NOT NULL DEFAULT '[]',
  recent_tender_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE home_tender_stats IS '홈 대시보드용: 등록 업종 기준 접수 중 건수·오늘 공고·업종별 건수·최근 5건 id';
COMMENT ON COLUMN home_tender_stats.industry_breakdown IS '[{industry_code, industry_name, count}, ...]';

CREATE INDEX IF NOT EXISTS idx_job_post_stats_updated ON job_post_stats(updated_at);
CREATE INDEX IF NOT EXISTS idx_listing_stats_updated ON listing_stats(updated_at);
CREATE INDEX IF NOT EXISTS idx_home_tender_stats_updated ON home_tender_stats(updated_at);

-- 공용 요약 테이블: 읽기는 모두 허용, 쓰기는 트리거/서비스만 (RLS 비활성화로 트리거에서 갱신 가능)
ALTER TABLE job_post_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_tender_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_post_stats_read" ON job_post_stats;
CREATE POLICY "job_post_stats_read" ON job_post_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "listing_stats_read" ON listing_stats;
CREATE POLICY "listing_stats_read" ON listing_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "home_tender_stats_read" ON home_tender_stats;
CREATE POLICY "home_tender_stats_read" ON home_tender_stats FOR SELECT USING (true);

-- 쓰기: 서비스 역할만 (크론/API에서 refresh_* 호출). anon/authenticated 는 읽기 전용.

-- job_post_stats 갱신 함수 (크론/API에서 RPC 호출)
CREATE OR REPLACE FUNCTION public.refresh_job_post_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;
  cnt INT;
BEGIN
  SELECT COUNT(*)::INT INTO cnt
  FROM job_posts
  WHERE status = 'open'
    AND (work_date IS NULL OR work_date >= today_date);
  INSERT INTO job_post_stats (id, open_count, updated_at)
  VALUES (1, cnt, NOW())
  ON CONFLICT (id) DO UPDATE SET open_count = EXCLUDED.open_count, updated_at = EXCLUDED.updated_at;
END;
$$;

-- listing_stats 갱신 함수
CREATE OR REPLACE FUNCTION public.refresh_listing_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*)::INT INTO cnt
  FROM listings
  WHERE listing_type IN ('referral_regular', 'referral_one_time', 'sale_regular', 'subcontract');
  INSERT INTO listing_stats (id, total_count, updated_at)
  VALUES (1, cnt, NOW())
  ON CONFLICT (id) DO UPDATE SET total_count = EXCLUDED.total_count, updated_at = EXCLUDED.updated_at;
END;
$$;

-- 갱신: 크론 또는 API에서 refresh_job_post_stats(), refresh_listing_stats() 호출 (서비스 역할).
-- 새 구인글/현장거래 등록 시 캐시 무효화 규칙에 따라 해당 크론이 돌면 갱신됨.

-- 최초 1회 채우기 (실패해도 마이그레이션은 성공 처리)
DO $$
BEGIN
  PERFORM refresh_job_post_stats();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'refresh_job_post_stats: %', SQLERRM;
END;
$$;
DO $$
BEGIN
  PERFORM refresh_listing_stats();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'refresh_listing_stats: %', SQLERRM;
END;
$$;
