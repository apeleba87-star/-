-- 앱으로 찍은 현장 사진. 원본과 미리보기를 ai-blog-photos 버킷에 둔다.
-- 원본은 완료하거나 original_expires_at 이 지나면 지우고 preview_path 만 남긴다.

ALTER TABLE cleanidex.project_media
  ADD COLUMN IF NOT EXISTS preview_path TEXT,
  ADD COLUMN IF NOT EXISTS original_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN cleanidex.project_media.storage_path IS
  '앱 촬영 원본. ai-blog-photos 버킷 경로. PC 폴더 현장은 NULL.';
COMMENT ON COLUMN cleanidex.project_media.preview_path IS
  '긴 변 720px 미리보기. 원본을 지운 뒤에도 남는다.';
COMMENT ON COLUMN cleanidex.project_media.original_expires_at IS
  '이 시각 이후 원본 파일을 지운다. 미리보기는 유지.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-blog-photos',
  'ai-blog-photos',
  false,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

DROP POLICY IF EXISTS "ai_blog_photos_read_company" ON storage.objects;
CREATE POLICY "ai_blog_photos_read_company" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'ai-blog-photos'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);

DROP POLICY IF EXISTS "ai_blog_photos_insert_company" ON storage.objects;
CREATE POLICY "ai_blog_photos_insert_company" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ai-blog-photos'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);

DROP POLICY IF EXISTS "ai_blog_photos_update_company" ON storage.objects;
CREATE POLICY "ai_blog_photos_update_company" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'ai-blog-photos'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
)
WITH CHECK (
  bucket_id = 'ai-blog-photos'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);

DROP POLICY IF EXISTS "ai_blog_photos_delete_company" ON storage.objects;
CREATE POLICY "ai_blog_photos_delete_company" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'ai-blog-photos'
  AND split_part(name, '/', 1) = cleanidex.current_company_id()::text
);
