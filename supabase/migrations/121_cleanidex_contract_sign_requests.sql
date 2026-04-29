-- Contract sign request flow for public signer links

ALTER TABLE cleanidex.contracts
  ADD COLUMN IF NOT EXISTS source_pdf_file_id UUID REFERENCES cleanidex.files(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS cleanidex.contract_sign_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES cleanidex.contracts(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('client', 'company')),
  recipient_name TEXT,
  recipient_contact TEXT,
  token_hash TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  opened_ip INET,
  opened_device TEXT,
  completed_at TIMESTAMPTZ,
  completed_ip INET,
  completed_device TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_sign_requests_company ON cleanidex.contract_sign_requests(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_sign_requests_contract ON cleanidex.contract_sign_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_sign_requests_token_hash ON cleanidex.contract_sign_requests(token_hash);

ALTER TABLE cleanidex.contract_sign_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanidex_contract_sign_requests_rw_company" ON cleanidex.contract_sign_requests;
CREATE POLICY "cleanidex_contract_sign_requests_rw_company" ON cleanidex.contract_sign_requests
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP TRIGGER IF EXISTS trg_cleanidex_contract_sign_requests_updated_at ON cleanidex.contract_sign_requests;
CREATE TRIGGER trg_cleanidex_contract_sign_requests_updated_at
BEFORE UPDATE ON cleanidex.contract_sign_requests
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();
