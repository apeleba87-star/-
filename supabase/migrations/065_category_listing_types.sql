-- 업무 종류(카테고리)별로 노출할 거래 유형(정기 매매, 정기 소개 등) 지정
-- 행이 없으면 해당 카테고리는 모든 유형에서 선택 가능
CREATE TABLE IF NOT EXISTS public.category_listing_types (
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale_regular', 'sale_one_time', 'referral_regular', 'referral_one_time', 'subcontract')),
  PRIMARY KEY (category_id, listing_type)
);

CREATE INDEX IF NOT EXISTS idx_category_listing_types_listing_type ON public.category_listing_types(listing_type);
COMMENT ON TABLE public.category_listing_types IS '현장거래(usage=listing) 카테고리별 적용 거래 유형. 비어 있으면 모든 유형에서 선택 가능';
