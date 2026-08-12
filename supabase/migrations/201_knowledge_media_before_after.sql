-- 전후 비교 이미지 role (상황별 레시피)

ALTER TABLE public.knowledge_media
  DROP CONSTRAINT IF EXISTS knowledge_media_role_check;

ALTER TABLE public.knowledge_media
  ADD CONSTRAINT knowledge_media_role_check
  CHECK (role IN ('cover', 'gallery', 'inline', 'before', 'after'));

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_media_before_after_unique
  ON public.knowledge_media (entity_type, entity_id, role)
  WHERE role IN ('before', 'after');
