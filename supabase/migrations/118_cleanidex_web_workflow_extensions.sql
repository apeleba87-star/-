-- Cleanidex web workflow extensions
-- 1) site photo zones
-- 2) site checklist template mapping
-- 3) client confirmation opened evidence

CREATE TABLE IF NOT EXISTS cleanidex.photo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES cleanidex.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_photo_zones_site ON cleanidex.photo_zones(site_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_cleanidex_photo_zones_company ON cleanidex.photo_zones(company_id);

CREATE TABLE IF NOT EXISTS cleanidex.site_checklist_templates (
  site_id UUID PRIMARY KEY REFERENCES cleanidex.sites(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES cleanidex.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES cleanidex.checklist_templates(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleanidex_site_checklist_templates_company ON cleanidex.site_checklist_templates(company_id);

ALTER TABLE cleanidex.work_photos
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES cleanidex.photo_zones(id) ON DELETE SET NULL;

ALTER TABLE cleanidex.client_confirmations
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_ip INET,
  ADD COLUMN IF NOT EXISTS opened_device TEXT;

ALTER TABLE cleanidex.photo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanidex.site_checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleanidex_photo_zones_rw_company" ON cleanidex.photo_zones;
CREATE POLICY "cleanidex_photo_zones_rw_company" ON cleanidex.photo_zones
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP POLICY IF EXISTS "cleanidex_site_checklist_templates_rw_company" ON cleanidex.site_checklist_templates;
CREATE POLICY "cleanidex_site_checklist_templates_rw_company" ON cleanidex.site_checklist_templates
  FOR ALL TO authenticated
  USING (company_id = cleanidex.current_company_id())
  WITH CHECK (company_id = cleanidex.current_company_id());

DROP TRIGGER IF EXISTS trg_cleanidex_photo_zones_updated_at ON cleanidex.photo_zones;
CREATE TRIGGER trg_cleanidex_photo_zones_updated_at
BEFORE UPDATE ON cleanidex.photo_zones
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();

DROP TRIGGER IF EXISTS trg_cleanidex_site_checklist_templates_updated_at ON cleanidex.site_checklist_templates;
CREATE TRIGGER trg_cleanidex_site_checklist_templates_updated_at
BEFORE UPDATE ON cleanidex.site_checklist_templates
FOR EACH ROW EXECUTE FUNCTION cleanidex.set_updated_at();
