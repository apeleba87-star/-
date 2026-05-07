-- Cleanidex 하드닝: 중복 오픈 세션 방지, 출근 rate-limit 조회용 인덱스,
-- 거래처별 최신 요구사항 1건을 DB에서 한 번에 조회하는 RPC.

-- 1) 동시에 "시작됐지만 아직 종료 안 된" 세션은 회사+작성자당 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_cleanidex_work_sessions_one_open_started_per_user
  ON cleanidex.work_sessions (company_id, created_by)
  WHERE end_time IS NULL AND start_time IS NOT NULL;

-- 2) 출근 API rate limit 조회 (user_id + kind + occurred_at)
CREATE INDEX IF NOT EXISTS idx_cleanidex_attendance_events_user_kind_time
  ON cleanidex.attendance_events (user_id, kind, occurred_at DESC);

-- 3) 회사 소속 거래처별 "최신" 요구사항 1건 (RLS는 SECURITY INVOKER 로 호출자 기준 적용)
CREATE OR REPLACE FUNCTION public.cleanidex_company_latest_client_requirements(p_company_id uuid)
RETURNS SETOF cleanidex.client_requirements
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = cleanidex, public
AS $$
  SELECT DISTINCT ON (cr.client_id) cr.*
  FROM cleanidex.client_requirements cr
  WHERE cr.company_id = p_company_id
  ORDER BY cr.client_id, cr.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.cleanidex_company_latest_client_requirements(uuid) TO authenticated;
