-- 현장별 주간 방문 룰 + 일시적 변경 + 작업세션 완료 추적.
-- 주 시작은 월요일 고정. 공휴일 영향 없음(요일 룰이면 그 요일이 공휴일이라도 카운트).
-- 완료 정의: start_time + end_time + 모든 is_required 사진 구역에 사진 1장 이상.
-- 한 번 완료된 세션은 monotonic — 이후 입력 변경/요구 추가에도 completed_at 유지.

-- 1) 사이트별 스케줄 룰 ----------------------------------------------------------
-- effective_from 부터 적용. 같은 사이트 다중 row 가능(시작일 기준 최신이 활성).
CREATE TABLE IF NOT EXISTS cleanidex.site_schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES cleanidex.sites(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly_count', 'weekday')),
  weekly_count INT,
  weekdays SMALLINT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_schedule_rules_payload_chk CHECK (
    (cadence = 'weekly_count' AND weekly_count IS NOT NULL AND weekly_count BETWEEN 1 AND 14 AND weekdays IS NULL)
    OR (cadence = 'weekday' AND weekdays IS NOT NULL AND array_length(weekdays, 1) BETWEEN 1 AND 7 AND weekly_count IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_site_schedule_rules_site_eff
  ON cleanidex.site_schedule_rules(site_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_site_schedule_rules_company
  ON cleanidex.site_schedule_rules(company_id);

-- 2) 일시적 변경(스킵/추가/이동) -------------------------------------------------
-- week_start = 해당 주 월요일 (date_trunc('week') in PG = 월요일 기반).
CREATE TABLE IF NOT EXISTS cleanidex.site_visit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES cleanidex.sites(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('skip', 'add')),
  occur_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, week_start, kind, occur_date)
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_site_visit_overrides_week
  ON cleanidex.site_visit_overrides(company_id, week_start);
CREATE INDEX IF NOT EXISTS idx_cleanidex_site_visit_overrides_site_week
  ON cleanidex.site_visit_overrides(site_id, week_start);

-- 3) 작업세션 완료 컬럼 (monotonic) ----------------------------------------------
ALTER TABLE cleanidex.work_sessions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cleanidex_work_sessions_site_date_completed
  ON cleanidex.work_sessions(site_id, work_date) WHERE completed_at IS NOT NULL;

-- 4) 자동완료 함수 + 트리거 ------------------------------------------------------
-- 정의: start_time/end_time 모두 있고 site 의 모든 is_required photo_zone 에 사진 1장+.
-- required_count = 0 인 사이트는 "완료 정의 안 됨" 으로 간주, 자동완료 보류.
CREATE OR REPLACE FUNCTION cleanidex.try_mark_session_complete(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_site UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_completed TIMESTAMPTZ;
  v_required INT;
  v_filled INT;
BEGIN
  SELECT site_id, start_time, end_time, completed_at
    INTO v_site, v_start, v_end, v_completed
  FROM cleanidex.work_sessions
  WHERE id = p_session_id;

  IF v_site IS NULL OR v_completed IS NOT NULL THEN
    RETURN; -- 세션 없음 or 이미 완료(monotonic 유지)
  END IF;
  IF v_start IS NULL OR v_end IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_required
  FROM cleanidex.photo_zones
  WHERE site_id = v_site AND is_required = TRUE;

  IF v_required = 0 THEN
    RETURN; -- 필수 구역 미정의 → 자동 완료 보류
  END IF;

  SELECT COUNT(DISTINCT pz.id) INTO v_filled
  FROM cleanidex.photo_zones pz
  WHERE pz.site_id = v_site
    AND pz.is_required = TRUE
    AND EXISTS (
      SELECT 1 FROM cleanidex.work_photos wp
      WHERE wp.work_session_id = p_session_id
        AND wp.zone_id = pz.id
    );

  IF v_filled >= v_required THEN
    UPDATE cleanidex.work_sessions
    SET completed_at = NOW()
    WHERE id = p_session_id AND completed_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanidex.try_mark_session_complete(UUID) TO authenticated, service_role;

-- work_photos INSERT 시 자동 재계산
CREATE OR REPLACE FUNCTION cleanidex.tg_work_photos_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
BEGIN
  PERFORM cleanidex.try_mark_session_complete(NEW.work_session_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanidex_work_photos_complete ON cleanidex.work_photos;
CREATE TRIGGER trg_cleanidex_work_photos_complete
AFTER INSERT ON cleanidex.work_photos
FOR EACH ROW EXECUTE FUNCTION cleanidex.tg_work_photos_after_insert();

-- work_sessions start/end 변경 시 자동 재계산
CREATE OR REPLACE FUNCTION cleanidex.tg_work_sessions_after_time_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
BEGIN
  IF NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    PERFORM cleanidex.try_mark_session_complete(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanidex_work_sessions_complete ON cleanidex.work_sessions;
CREATE TRIGGER trg_cleanidex_work_sessions_complete
AFTER UPDATE OF start_time, end_time ON cleanidex.work_sessions
FOR EACH ROW EXECUTE FUNCTION cleanidex.tg_work_sessions_after_time_change();

-- 5) RLS ----------------------------------------------------------------------
ALTER TABLE cleanidex.site_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.site_visit_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanidex_site_schedule_rules_rw_company" ON cleanidex.site_schedule_rules;
CREATE POLICY "cleanidex_site_schedule_rules_rw_company" ON cleanidex.site_schedule_rules
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_site_visit_overrides_rw_company" ON cleanidex.site_visit_overrides;
CREATE POLICY "cleanidex_site_visit_overrides_rw_company" ON cleanidex.site_visit_overrides
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

-- updated_at 트리거
DROP TRIGGER IF EXISTS trg_cleanidex_site_schedule_rules_updated_at ON cleanidex.site_schedule_rules;
CREATE TRIGGER trg_cleanidex_site_schedule_rules_updated_at
BEFORE UPDATE ON cleanidex.site_schedule_rules
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();
