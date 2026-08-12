-- 지식허브(세제·장비·청소지식) 이미지: Storage 공개 버킷 + 메타만 DB 저장
-- 원본 바이너리는 DB에 넣지 않음. 업로드 시 WebP 변환본만 저장하는 것을 권장.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-media',
  'knowledge-media',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "knowledge_media_public_read" ON storage.objects;
CREATE POLICY "knowledge_media_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'knowledge-media');

DROP POLICY IF EXISTS "knowledge_media_admin_insert" ON storage.objects;
CREATE POLICY "knowledge_media_admin_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'knowledge-media'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

DROP POLICY IF EXISTS "knowledge_media_admin_update" ON storage.objects;
CREATE POLICY "knowledge_media_admin_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'knowledge-media'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

DROP POLICY IF EXISTS "knowledge_media_admin_delete" ON storage.objects;
CREATE POLICY "knowledge_media_admin_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'knowledge-media'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

CREATE TABLE IF NOT EXISTS public.knowledge_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'equipment', 'edu_blog', 'guide')),
  entity_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cover' CHECK (role IN ('cover', 'gallery', 'inline')),
  url TEXT NOT NULL,
  thumb_url TEXT,
  alt TEXT,
  width INT,
  height INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_media_cover_unique
  ON public.knowledge_media (entity_type, entity_id)
  WHERE role = 'cover';

CREATE INDEX IF NOT EXISTS knowledge_media_entity_idx
  ON public.knowledge_media (entity_type, entity_id);

ALTER TABLE public.knowledge_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_media_select_public" ON public.knowledge_media;
CREATE POLICY "knowledge_media_select_public" ON public.knowledge_media
FOR SELECT USING (true);

DROP POLICY IF EXISTS "knowledge_media_write_staff" ON public.knowledge_media;
CREATE POLICY "knowledge_media_write_staff" ON public.knowledge_media
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
