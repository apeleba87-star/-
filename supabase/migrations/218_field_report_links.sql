-- 고객용 청소 보고서 링크. 토큰을 아는 사람만 서버가 사진을 보여 준다.
-- 고객(anon)은 이 표를 읽지 못한다. 페이지는 service role 로만 조회한다.

CREATE TABLE IF NOT EXISTS cleanidex.field_report_links (
  project_id UUID PRIMARY KEY REFERENCES cleanidex.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT field_report_links_token_chk CHECK (token ~ '^[A-Za-z0-9]{16,64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS field_report_links_token_idx
  ON cleanidex.field_report_links (token);

ALTER TABLE cleanidex.field_report_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanidex_field_report_links_rw_company" ON cleanidex.field_report_links;
CREATE POLICY "cleanidex_field_report_links_rw_company"
  ON cleanidex.field_report_links
  FOR ALL
  TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (
    company_id = cleanidex.current_company_id()
    AND EXISTS (
      SELECT 1
      FROM cleanidex.projects p
      WHERE p.id = project_id
        AND p.company_id = cleanidex.current_company_id()
        AND p.deleted_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cleanidex.field_report_links TO authenticated, service_role;
