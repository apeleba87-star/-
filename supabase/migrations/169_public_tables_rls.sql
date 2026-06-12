-- Security Advisor: RLS disabled on public tables exposed to PostgREST

-- 1) tenders_archive — cron(service role) 전용, API 직접 접근 차단
ALTER TABLE public.tenders_archive ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tenders_archive IS
  '오래된 입찰 아카이브 — RLS ON·정책 없음(anon 차단), archive_old_tenders는 service role';

-- 2) category_listing_types — 읽기 공개, 쓰기는 staff
ALTER TABLE public.category_listing_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_listing_types_read" ON public.category_listing_types;
CREATE POLICY "category_listing_types_read" ON public.category_listing_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "category_listing_types_admin" ON public.category_listing_types;
CREATE POLICY "category_listing_types_admin" ON public.category_listing_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- 3) job_type_presets — 읽기 공개(참조 데이터), 쓰기는 staff
ALTER TABLE public.job_type_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_type_presets_read" ON public.job_type_presets;
CREATE POLICY "job_type_presets_read" ON public.job_type_presets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "job_type_presets_admin" ON public.job_type_presets;
CREATE POLICY "job_type_presets_admin" ON public.job_type_presets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );
