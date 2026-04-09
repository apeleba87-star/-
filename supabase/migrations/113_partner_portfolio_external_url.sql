-- 포트폴리오: Storage 업로드 경로 또는 외부 이미지 URL 중 하나로 저장

ALTER TABLE public.partner_company_portfolio_items
  ADD COLUMN IF NOT EXISTS external_image_url TEXT;

ALTER TABLE public.partner_company_portfolio_items
  ALTER COLUMN image_path_thumb DROP NOT NULL,
  ALTER COLUMN image_path_display DROP NOT NULL;

ALTER TABLE public.partner_company_portfolio_items
  DROP CONSTRAINT IF EXISTS partner_portfolio_image_source_check;

ALTER TABLE public.partner_company_portfolio_items
  ADD CONSTRAINT partner_portfolio_image_source_check CHECK (
    (
      external_image_url IS NOT NULL
      AND length(trim(external_image_url)) > 0
    )
    OR (
      image_path_thumb IS NOT NULL
      AND length(trim(image_path_thumb)) > 0
      AND image_path_display IS NOT NULL
      AND length(trim(image_path_display)) > 0
    )
  );
