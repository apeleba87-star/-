-- Cleanidex MVP foundation
-- Goal: contract -> work record -> client confirm -> evidence report

CREATE SCHEMA IF NOT EXISTS cleanidex;

GRANT USAGE ON SCHEMA cleanidex TO authenticated, anon, service_role;

CREATE TABLE IF NOT EXISTS cleanidex.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_number TEXT,
  owner_user_id UUID REFERENCES auth.users(id),
  is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleanidex.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cleanidex.roles (code, name)
VALUES
  ('owner', 'Owner'),
  ('manager', 'Manager'),
  ('staff', 'Staff')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS cleanidex.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  role_id UUID REFERENCES cleanidex.roles(id),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, company_id)
);

CREATE OR REPLACE FUNCTION cleanidex.current_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
  SELECT u.company_id
  FROM cleanidex.users u
  WHERE u.id = auth.uid()
    AND u.is_active = TRUE
  LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS cleanidex.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_clients_company ON cleanidex.clients(company_id);

CREATE TABLE IF NOT EXISTS cleanidex.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES cleanidex.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_sites_company ON cleanidex.sites(company_id);
CREATE INDEX IF NOT EXISTS idx_cleanidex_sites_client ON cleanidex.sites(client_id);

CREATE TABLE IF NOT EXISTS cleanidex.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_templates_company ON cleanidex.contract_templates(company_id);

CREATE TABLE IF NOT EXISTS cleanidex.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES cleanidex.clients(id) ON DELETE RESTRICT,
  site_id UUID REFERENCES cleanidex.sites(id) ON DELETE SET NULL,
  template_id UUID REFERENCES cleanidex.contract_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'cancelled')),
  signed_pdf_file_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contracts_company ON cleanidex.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contracts_client ON cleanidex.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contracts_status ON cleanidex.contracts(status);

CREATE TABLE IF NOT EXISTS cleanidex.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES cleanidex.contracts(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('client', 'company')),
  signer_name TEXT,
  signature_file_id UUID,
  ip INET,
  device TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_signatures_company ON cleanidex.contract_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_signatures_contract ON cleanidex.contract_signatures(contract_id);

CREATE TABLE IF NOT EXISTS cleanidex.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES cleanidex.sites(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES cleanidex.contracts(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_work_sessions_company_date ON cleanidex.work_sessions(company_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_work_sessions_site ON cleanidex.work_sessions(site_id);

CREATE TABLE IF NOT EXISTS cleanidex.checklist_option_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_checklist_option_sets_company ON cleanidex.checklist_option_sets(company_id);

CREATE TABLE IF NOT EXISTS cleanidex.checklist_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  option_set_id UUID NOT NULL REFERENCES cleanidex.checklist_option_sets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  color_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_checklist_options_set ON cleanidex.checklist_options(option_set_id, sort_order);

CREATE TABLE IF NOT EXISTS cleanidex.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  option_set_id UUID REFERENCES cleanidex.checklist_option_sets(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_checklist_templates_company ON cleanidex.checklist_templates(company_id);

CREATE TABLE IF NOT EXISTS cleanidex.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES cleanidex.checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_checklist_items_template ON cleanidex.checklist_items(template_id, sort_order);

CREATE TABLE IF NOT EXISTS cleanidex.checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  work_session_id UUID NOT NULL REFERENCES cleanidex.work_sessions(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES cleanidex.checklist_items(id) ON DELETE RESTRICT,
  selected_option_id UUID NOT NULL REFERENCES cleanidex.checklist_options(id) ON DELETE RESTRICT,
  responder_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_session_id, checklist_item_id)
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_checklist_responses_work_session ON cleanidex.checklist_responses(work_session_id);

CREATE TABLE IF NOT EXISTS cleanidex.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL DEFAULT 'cleanidex-private',
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('contract_pdf', 'signature', 'work_photo', 'report_pdf', 'other')),
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  sha256 TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_files_company ON cleanidex.files(company_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contracts_signed_pdf_file_fk'
  ) THEN
    ALTER TABLE cleanidex.contracts
      ADD CONSTRAINT contracts_signed_pdf_file_fk
      FOREIGN KEY (signed_pdf_file_id) REFERENCES cleanidex.files(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contract_signatures_signature_file_fk'
  ) THEN
    ALTER TABLE cleanidex.contract_signatures
      ADD CONSTRAINT contract_signatures_signature_file_fk
      FOREIGN KEY (signature_file_id) REFERENCES cleanidex.files(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cleanidex.work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  work_session_id UUID NOT NULL REFERENCES cleanidex.work_sessions(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES cleanidex.files(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_work_photos_session ON cleanidex.work_photos(work_session_id);

CREATE TABLE IF NOT EXISTS cleanidex.client_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  work_session_id UUID NOT NULL UNIQUE REFERENCES cleanidex.work_sessions(id) ON DELETE CASCADE,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by_name TEXT,
  confirmed_at TIMESTAMPTZ,
  ip INET,
  device TEXT,
  token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_client_confirmations_company ON cleanidex.client_confirmations(company_id);

CREATE TABLE IF NOT EXISTS cleanidex.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  work_session_id UUID NOT NULL REFERENCES cleanidex.work_sessions(id) ON DELETE CASCADE,
  generated_pdf_file_id UUID REFERENCES cleanidex.files(id) ON DELETE SET NULL,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_reports_company ON cleanidex.reports(company_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS cleanidex.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  ip INET,
  device TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_audit_logs_company_created ON cleanidex.audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_audit_logs_action ON cleanidex.audit_logs(action);

ALTER TABLE cleanidex.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.checklist_option_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.checklist_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.work_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.client_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanidex_roles_read_all_auth" ON cleanidex.roles;
CREATE POLICY "cleanidex_roles_read_all_auth" ON cleanidex.roles
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "cleanidex_companies_by_membership" ON cleanidex.companies;
CREATE POLICY "cleanidex_companies_by_membership" ON cleanidex.companies
  FOR SELECT TO authenticated
  USING (id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_users_read_company" ON cleanidex.users;
CREATE POLICY "cleanidex_users_read_company" ON cleanidex.users
  FOR SELECT TO authenticated
  USING (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_users_update_self" ON cleanidex.users;
CREATE POLICY "cleanidex_users_update_self" ON cleanidex.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND company_id = cleanidex.current_company_id())
  WITH CHECK (id = auth.uid() AND company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_users_insert_self" ON cleanidex.users;
CREATE POLICY "cleanidex_users_insert_self" ON cleanidex.users
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND (
      company_id = cleanidex.current_company_id()
      OR (
        cleanidex.current_company_id() IS NULL
        AND EXISTS (
          SELECT 1
          FROM cleanidex.companies c
          WHERE c.id = company_id
            AND c.owner_user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "cleanidex_clients_rw_company" ON cleanidex.clients;
CREATE POLICY "cleanidex_clients_rw_company" ON cleanidex.clients
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_sites_rw_company" ON cleanidex.sites;
CREATE POLICY "cleanidex_sites_rw_company" ON cleanidex.sites
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_contract_templates_rw_company" ON cleanidex.contract_templates;
CREATE POLICY "cleanidex_contract_templates_rw_company" ON cleanidex.contract_templates
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_contracts_rw_company" ON cleanidex.contracts;
CREATE POLICY "cleanidex_contracts_rw_company" ON cleanidex.contracts
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_contract_signatures_rw_company" ON cleanidex.contract_signatures;
CREATE POLICY "cleanidex_contract_signatures_rw_company" ON cleanidex.contract_signatures
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_work_sessions_rw_company" ON cleanidex.work_sessions;
CREATE POLICY "cleanidex_work_sessions_rw_company" ON cleanidex.work_sessions
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_checklist_option_sets_rw_company" ON cleanidex.checklist_option_sets;
CREATE POLICY "cleanidex_checklist_option_sets_rw_company" ON cleanidex.checklist_option_sets
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_checklist_options_rw_company" ON cleanidex.checklist_options;
CREATE POLICY "cleanidex_checklist_options_rw_company" ON cleanidex.checklist_options
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_checklist_templates_rw_company" ON cleanidex.checklist_templates;
CREATE POLICY "cleanidex_checklist_templates_rw_company" ON cleanidex.checklist_templates
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_checklist_items_rw_company" ON cleanidex.checklist_items;
CREATE POLICY "cleanidex_checklist_items_rw_company" ON cleanidex.checklist_items
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_checklist_responses_rw_company" ON cleanidex.checklist_responses;
CREATE POLICY "cleanidex_checklist_responses_rw_company" ON cleanidex.checklist_responses
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_files_rw_company" ON cleanidex.files;
CREATE POLICY "cleanidex_files_rw_company" ON cleanidex.files
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_work_photos_rw_company" ON cleanidex.work_photos;
CREATE POLICY "cleanidex_work_photos_rw_company" ON cleanidex.work_photos
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_client_confirmations_rw_company" ON cleanidex.client_confirmations;
CREATE POLICY "cleanidex_client_confirmations_rw_company" ON cleanidex.client_confirmations
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_reports_rw_company" ON cleanidex.reports;
CREATE POLICY "cleanidex_reports_rw_company" ON cleanidex.reports
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_audit_logs_rw_company" ON cleanidex.audit_logs;
CREATE POLICY "cleanidex_audit_logs_rw_company" ON cleanidex.audit_logs
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());
