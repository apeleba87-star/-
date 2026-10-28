-- 제품 「구매하기」 클릭 추적
CREATE TABLE IF NOT EXISTS public.product_sales_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  destination_url TEXT,
  source TEXT,
  page_path TEXT,
  referrer TEXT,
  session_id TEXT,
  anon_visitor_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.product_sales_clicks IS '지식허브 제품 구매하기 CTA 클릭 로그';
COMMENT ON COLUMN public.product_sales_clicks.source IS '클릭 위치: product_detail, recipe, guide, go_p 등';

CREATE INDEX IF NOT EXISTS idx_product_sales_clicks_product_created
  ON public.product_sales_clicks(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sales_clicks_created
  ON public.product_sales_clicks(created_at DESC);

ALTER TABLE public.product_sales_clicks ENABLE ROW LEVEL SECURITY;

-- 삽입: 서버(service role) 또는 anon(리다이렉트 라우트는 service 사용)
DROP POLICY IF EXISTS "product_sales_clicks_select_admin" ON public.product_sales_clicks;
CREATE POLICY "product_sales_clicks_select_admin" ON public.product_sales_clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

GRANT SELECT ON TABLE public.product_sales_clicks TO authenticated;
GRANT SELECT, INSERT ON TABLE public.product_sales_clicks TO service_role;
