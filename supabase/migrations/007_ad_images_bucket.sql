-- 홈 광고 이미지/GIF 업로드용 스토리지 버킷 (public read, 인증된 사용자만 업로드)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 인증된 사용자 중 admin/editor만 업로드 가능 (RLS)
DROP POLICY IF EXISTS "admin_ad_images_upload" ON storage.objects;
CREATE POLICY "admin_ad_images_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'ad-images'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

DROP POLICY IF EXISTS "admin_ad_images_update" ON storage.objects;
CREATE POLICY "admin_ad_images_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'ad-images'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

DROP POLICY IF EXISTS "admin_ad_images_delete" ON storage.objects;
CREATE POLICY "admin_ad_images_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'ad-images'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- public read은 버킷이 public이면 기본 허용
