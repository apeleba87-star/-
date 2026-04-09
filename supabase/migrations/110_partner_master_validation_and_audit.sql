-- 협력센터 마스터(업종/지역) 코드 검증 강화 + 변경 이력 로그

-- 코드 형식 검증: 소문자/숫자/언더스코어, 2~40자
ALTER TABLE public.partner_categories
  DROP CONSTRAINT IF EXISTS partner_categories_code_format_check;
ALTER TABLE public.partner_categories
  ADD CONSTRAINT partner_categories_code_format_check
  CHECK (code ~ '^[a-z0-9_]{2,40}$');

ALTER TABLE public.partner_regions
  DROP CONSTRAINT IF EXISTS partner_regions_code_format_check;
ALTER TABLE public.partner_regions
  ADD CONSTRAINT partner_regions_code_format_check
  CHECK (code ~ '^[a-z0-9_]{2,40}$');

-- 지역 parent 자기참조 금지
ALTER TABLE public.partner_regions
  DROP CONSTRAINT IF EXISTS partner_regions_parent_not_self_check;
ALTER TABLE public.partner_regions
  ADD CONSTRAINT partner_regions_parent_not_self_check
  CHECK (parent_code IS NULL OR parent_code <> code);

-- 마스터 변경 이력
CREATE TABLE IF NOT EXISTS public.partner_master_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category', 'region')),
  entity_code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'toggle_active', 'sort_change')),
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_master_change_logs_entity_created
  ON public.partner_master_change_logs(entity_type, entity_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_master_change_logs_actor_created
  ON public.partner_master_change_logs(actor_user_id, created_at DESC);

ALTER TABLE public.partner_master_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_master_logs_admin_select" ON public.partner_master_change_logs;
CREATE POLICY "partner_master_logs_admin_select"
  ON public.partner_master_change_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "partner_master_logs_admin_insert" ON public.partner_master_change_logs;
CREATE POLICY "partner_master_logs_admin_insert"
  ON public.partner_master_change_logs FOR INSERT
  WITH CHECK (
    auth.uid() = actor_user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'editor')
    )
  );
