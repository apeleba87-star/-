-- 출근(GPS 체크인) = 작업세션 시작. 체크아웃 = 작업세션 종료.
-- 사이트에 위경도/지오펜스 반경을 두고 distance_m 계산. 반경 밖이어도 차단하지 않고 'outside' 플래그.
-- 정확도 정보(accuracy_m)는 클라이언트에서 보고 받은 값 그대로 저장.

-- 1) sites 에 위치/지오펜스 컬럼 ------------------------------------------------
ALTER TABLE cleanidex.sites
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS geofence_radius_m INT;

COMMENT ON COLUMN cleanidex.sites.geofence_radius_m IS '지오펜스 반경(m). NULL 이면 기본 200m 적용.';

-- 2) attendance_events ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS cleanidex.attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES cleanidex.sites(id) ON DELETE SET NULL,
  work_session_id UUID REFERENCES cleanidex.work_sessions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('check_in', 'check_out')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat NUMERIC(9, 6),
  lng NUMERIC(9, 6),
  accuracy_m REAL,
  distance_m REAL,
  geofence_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (geofence_status IN ('inside', 'outside', 'unknown')),
  notes TEXT,
  device TEXT,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_attendance_events_company_time
  ON cleanidex.attendance_events(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_attendance_events_user_time
  ON cleanidex.attendance_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_attendance_events_session
  ON cleanidex.attendance_events(work_session_id);

ALTER TABLE cleanidex.attendance_events ENABLE ROW LEVEL SECURITY;

-- 본인 또는 같은 회사 멤버의 출근 기록 SELECT 가능. INSERT 는 본인만.
DROP POLICY IF EXISTS "cleanidex_attendance_events_select_company" ON cleanidex.attendance_events;
CREATE POLICY "cleanidex_attendance_events_select_company" ON cleanidex.attendance_events
  FOR SELECT TO authenticated
  USING (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_attendance_events_insert_self" ON cleanidex.attendance_events;
CREATE POLICY "cleanidex_attendance_events_insert_self" ON cleanidex.attendance_events
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = cleanidex.current_company_id()
    AND user_id = auth.uid()
  );

-- 3) 거리 계산 도우미(haversine, m 단위) ----------------------------------------
CREATE OR REPLACE FUNCTION cleanidex.haversine_distance_m(
  lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(($3 - $1) / 2.0)), 2)
      + COS(RADIANS($1)) * COS(RADIANS($3))
        * POWER(SIN(RADIANS(($4 - $2) / 2.0)), 2)
    )
  )
$$;

GRANT EXECUTE ON FUNCTION cleanidex.haversine_distance_m(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
  TO authenticated, service_role;
