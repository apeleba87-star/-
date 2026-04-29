-- Cleanidex hardening: updated_at triggers, RPC helpers, and storage policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cleanidex-private',
  'cleanidex-private',
  false,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf'];

CREATE OR REPLACE FUNCTION cleanidex.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanidex_companies_updated_at ON cleanidex.companies;
CREATE TRIGGER trg_cleanidex_companies_updated_at
BEFORE UPDATE ON cleanidex.companies
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_users_updated_at ON cleanidex.users;
CREATE TRIGGER trg_cleanidex_users_updated_at
BEFORE UPDATE ON cleanidex.users
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_clients_updated_at ON cleanidex.clients;
CREATE TRIGGER trg_cleanidex_clients_updated_at
BEFORE UPDATE ON cleanidex.clients
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_sites_updated_at ON cleanidex.sites;
CREATE TRIGGER trg_cleanidex_sites_updated_at
BEFORE UPDATE ON cleanidex.sites
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_contract_templates_updated_at ON cleanidex.contract_templates;
CREATE TRIGGER trg_cleanidex_contract_templates_updated_at
BEFORE UPDATE ON cleanidex.contract_templates
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_contracts_updated_at ON cleanidex.contracts;
CREATE TRIGGER trg_cleanidex_contracts_updated_at
BEFORE UPDATE ON cleanidex.contracts
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_work_sessions_updated_at ON cleanidex.work_sessions;
CREATE TRIGGER trg_cleanidex_work_sessions_updated_at
BEFORE UPDATE ON cleanidex.work_sessions
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_checklist_option_sets_updated_at ON cleanidex.checklist_option_sets;
CREATE TRIGGER trg_cleanidex_checklist_option_sets_updated_at
BEFORE UPDATE ON cleanidex.checklist_option_sets
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_checklist_options_updated_at ON cleanidex.checklist_options;
CREATE TRIGGER trg_cleanidex_checklist_options_updated_at
BEFORE UPDATE ON cleanidex.checklist_options
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_checklist_templates_updated_at ON cleanidex.checklist_templates;
CREATE TRIGGER trg_cleanidex_checklist_templates_updated_at
BEFORE UPDATE ON cleanidex.checklist_templates
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_checklist_items_updated_at ON cleanidex.checklist_items;
CREATE TRIGGER trg_cleanidex_checklist_items_updated_at
BEFORE UPDATE ON cleanidex.checklist_items
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_checklist_responses_updated_at ON cleanidex.checklist_responses;
CREATE TRIGGER trg_cleanidex_checklist_responses_updated_at
BEFORE UPDATE ON cleanidex.checklist_responses
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_client_confirmations_updated_at ON cleanidex.client_confirmations;
CREATE TRIGGER trg_cleanidex_client_confirmations_updated_at
BEFORE UPDATE ON cleanidex.client_confirmations
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

CREATE OR REPLACE FUNCTION cleanidex.my_context()
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  role_code TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
  SELECT
    u.id AS user_id,
    u.company_id,
    r.code AS role_code
  FROM cleanidex.users u
  LEFT JOIN cleanidex.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
    AND u.is_active = TRUE
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION cleanidex.my_context() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanidex.current_company_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanidex_my_context()
RETURNS TABLE (
  user_id UUID,
  company_id UUID,
  role_code TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
  SELECT * FROM cleanidex.my_context();
$$;

GRANT EXECUTE ON FUNCTION public.cleanidex_my_context() TO authenticated;

DROP POLICY IF EXISTS "cleanidex_storage_read_company_prefix" ON storage.objects;
CREATE POLICY "cleanidex_storage_read_company_prefix" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cleanidex-private'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);

DROP POLICY IF EXISTS "cleanidex_storage_insert_company_prefix" ON storage.objects;
CREATE POLICY "cleanidex_storage_insert_company_prefix" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cleanidex-private'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);

DROP POLICY IF EXISTS "cleanidex_storage_update_company_prefix" ON storage.objects;
CREATE POLICY "cleanidex_storage_update_company_prefix" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'cleanidex-private'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
)
WITH CHECK (
  bucket_id = 'cleanidex-private'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);

DROP POLICY IF EXISTS "cleanidex_storage_delete_company_prefix" ON storage.objects;
CREATE POLICY "cleanidex_storage_delete_company_prefix" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'cleanidex-private'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);
