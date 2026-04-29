-- Checklist versioning + immutable template on work session

ALTER TABLE cleanidex.checklist_templates
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE cleanidex.checklist_templates
  ADD COLUMN IF NOT EXISTS base_template_id UUID REFERENCES cleanidex.checklist_templates(id) ON DELETE SET NULL;

ALTER TABLE cleanidex.work_sessions
  ADD COLUMN IF NOT EXISTS applied_template_id UUID REFERENCES cleanidex.checklist_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cleanidex_work_sessions_applied_template
  ON cleanidex.work_sessions(applied_template_id);

CREATE INDEX IF NOT EXISTS idx_cleanidex_checklist_templates_base_version
  ON cleanidex.checklist_templates(base_template_id, version);

CREATE OR REPLACE FUNCTION cleanidex.create_checklist_template_version(
  p_source_template_id UUID,
  p_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_source RECORD;
  v_base_id UUID;
  v_next_version INT;
  v_new_template_id UUID;
BEGIN
  SELECT *
  INTO v_source
  FROM cleanidex.checklist_templates
  WHERE id = p_source_template_id;

  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'source template not found';
  END IF;

  v_base_id := COALESCE(v_source.base_template_id, v_source.id);

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM cleanidex.checklist_templates
  WHERE id = v_base_id
     OR base_template_id = v_base_id;

  INSERT INTO cleanidex.checklist_templates (
    company_id, name, option_set_id, version, base_template_id, is_active
  )
  VALUES (
    v_source.company_id,
    COALESCE(p_name, v_source.name || ' v' || v_next_version::text),
    v_source.option_set_id,
    v_next_version,
    v_base_id,
    TRUE
  )
  RETURNING id INTO v_new_template_id;

  INSERT INTO cleanidex.checklist_items (
    company_id, template_id, title, description, sort_order
  )
  SELECT company_id, v_new_template_id, title, description, sort_order
  FROM cleanidex.checklist_items
  WHERE template_id = v_source.id
  ORDER BY sort_order, created_at;

  RETURN v_new_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanidex.create_checklist_template_version(UUID, TEXT) TO authenticated;
