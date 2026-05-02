-- Electronic contract signing: extended status, PDF chain, placements, evidence fields, immutability after completed.

-- 1) Migrate legacy status
UPDATE cleanidex.contracts SET status = 'completed' WHERE status = 'signed';

-- 2) Drop old status check and add extended statuses
ALTER TABLE cleanidex.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE cleanidex.contracts
  ADD CONSTRAINT contracts_status_check CHECK (
    status IN (
      'draft',
      'owner_signed',
      'sent',
      'client_signed',
      'completed',
      'cancelled'
    )
  );

-- 3) Contract metadata & PDF chain
ALTER TABLE cleanidex.contracts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS owner_signature_file_id UUID REFERENCES cleanidex.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_signed_pdf_file_id UUID REFERENCES cleanidex.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_pdf_file_id UUID REFERENCES cleanidex.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_signature_placement JSONB,
  ADD COLUMN IF NOT EXISTS client_signature_placement JSONB,
  ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_pdf_sha256 TEXT;

-- 4) Client signature evidence on contract_signatures
ALTER TABLE cleanidex.contract_signatures
  ADD COLUMN IF NOT EXISTS signer_phone TEXT,
  ADD COLUMN IF NOT EXISTS consent_text TEXT,
  ADD COLUMN IF NOT EXISTS consent_text_version TEXT,
  ADD COLUMN IF NOT EXISTS sign_request_id UUID REFERENCES cleanidex.contract_sign_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cleanidex_contract_signatures_sign_request
  ON cleanidex.contract_signatures(sign_request_id);

-- 5) Block any UPDATE once contract is completed (immutable row)
CREATE OR REPLACE FUNCTION cleanidex.contracts_reject_update_when_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'cleanidex_contract_completed_immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanidex_contracts_reject_completed_update ON cleanidex.contracts;
CREATE TRIGGER trg_cleanidex_contracts_reject_completed_update
  BEFORE UPDATE ON cleanidex.contracts
  FOR EACH ROW
  EXECUTE FUNCTION cleanidex.contracts_reject_update_when_completed();
