-- Cleanidex MVP checklist seed helper
-- Seeds default option set/template for companies that do not have checklist data yet.

CREATE OR REPLACE FUNCTION cleanidex.ensure_default_checklist_seed(target_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cleanidex, public
AS $$
DECLARE
  v_option_set_id UUID;
  v_template_id UUID;
BEGIN
  IF target_company_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_option_set_id
  FROM cleanidex.checklist_option_sets
  WHERE company_id = target_company_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_option_set_id IS NULL THEN
    INSERT INTO cleanidex.checklist_option_sets (company_id, name)
    VALUES (target_company_id, '기본 점검 옵션')
    RETURNING id INTO v_option_set_id;

    INSERT INTO cleanidex.checklist_options (company_id, option_set_id, label, sort_order, color_token)
    VALUES
      (target_company_id, v_option_set_id, '좋음', 1, 'green'),
      (target_company_id, v_option_set_id, '미흡', 2, 'red');
  END IF;

  SELECT id
  INTO v_template_id
  FROM cleanidex.checklist_templates
  WHERE company_id = target_company_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO cleanidex.checklist_templates (company_id, name, option_set_id, is_active)
    VALUES (target_company_id, '기본 작업 점검표', v_option_set_id, TRUE)
    RETURNING id INTO v_template_id;

    INSERT INTO cleanidex.checklist_items (company_id, template_id, title, sort_order)
    VALUES
      (target_company_id, v_template_id, '바닥 청결 상태', 1),
      (target_company_id, v_template_id, '화장실 청결 상태', 2),
      (target_company_id, v_template_id, '쓰레기 배출 완료', 3);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanidex.ensure_default_checklist_seed(UUID) TO authenticated;
