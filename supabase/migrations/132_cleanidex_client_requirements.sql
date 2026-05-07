-- 거래처 요구사항: 텍스트 + 협의 일시 + (선택) 협의 상대방 이름·연락처.
-- 변경 시 새 row 를 추가(append-only) → 담당자가 바뀌어도 이력 보존.
-- "현재 요구사항"은 client_id 별 최신 created_at 1건.

CREATE TABLE IF NOT EXISTS cleanidex.client_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES cleanidex.clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL,
  agreed_contact_name TEXT,
  agreed_contact_phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 빈 content 방지
  CONSTRAINT client_requirements_content_chk CHECK (length(btrim(content)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_client_requirements_client_time
  ON cleanidex.client_requirements(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_client_requirements_company
  ON cleanidex.client_requirements(company_id, created_at DESC);

ALTER TABLE cleanidex.client_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanidex_client_requirements_rw_company" ON cleanidex.client_requirements;
CREATE POLICY "cleanidex_client_requirements_rw_company" ON cleanidex.client_requirements
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());
