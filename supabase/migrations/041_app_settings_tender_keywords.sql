-- 입찰 키워드 사용 여부 스위치 (관리자에서 켜면 적용, 기본 비활성화)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'false',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS '앱 전역 설정. key: tender_keywords_enabled 등';

INSERT INTO public.app_settings (key, value) VALUES ('tender_keywords_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_admin_modify" ON public.app_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "app_settings_admin_update" ON public.app_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "app_settings_admin_delete" ON public.app_settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));
