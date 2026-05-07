-- 계약 소프트 삭제(휴지통) 컬럼 및 목록용 인덱스.
-- completed 행은 기본적으로 UPDATE 불가이나, deleted_at 변경(삭제/복구) 및 휴지통 내 수정은 허용.

ALTER TABLE cleanidex.contracts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

COMMENT ON COLUMN cleanidex.contracts.deleted_at IS 'NULL = 활성. 값 있음 = 휴지통(소프트 삭제).';
COMMENT ON COLUMN cleanidex.contracts.deleted_by IS '소프트 삭제를 수행한 사용자.';
COMMENT ON COLUMN cleanidex.contracts.deleted_reason IS '삭제 사유(선택).';

CREATE INDEX IF NOT EXISTS idx_cleanidex_contracts_company_active_created
  ON cleanidex.contracts (company_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cleanidex_contracts_company_completed_list
  ON cleanidex.contracts (company_id, completed_at DESC NULLS LAST, id DESC)
  WHERE deleted_at IS NULL AND status = 'completed';

CREATE INDEX IF NOT EXISTS idx_cleanidex_contracts_company_trash
  ON cleanidex.contracts (company_id, deleted_at DESC, id DESC)
  WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION cleanidex.contracts_reject_update_when_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
    RETURN NEW;
  END IF;
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'completed' AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'cleanidex_contract_completed_immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- INSERT 시 소프트삭제 상태로 생성 방지. authenticated 하드 DELETE는 정책 미부여로 차단.
-- 멱등성: 같은 마이그를 여러 번 실행해도 42710(이미 존재)이 나지 않도록 DROP IF EXISTS 후 재생성.
DROP POLICY IF EXISTS "cleanidex_contracts_rw_company" ON cleanidex.contracts;
DROP POLICY IF EXISTS "cleanidex_contracts_select_company" ON cleanidex.contracts;
DROP POLICY IF EXISTS "cleanidex_contracts_insert_company" ON cleanidex.contracts;
DROP POLICY IF EXISTS "cleanidex_contracts_update_company" ON cleanidex.contracts;

CREATE POLICY "cleanidex_contracts_select_company" ON cleanidex.contracts
  FOR SELECT TO authenticated
  USING (company_id = cleanidex.current_company_id());

CREATE POLICY "cleanidex_contracts_insert_company" ON cleanidex.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = cleanidex.current_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "cleanidex_contracts_update_company" ON cleanidex.contracts
  FOR UPDATE TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());
