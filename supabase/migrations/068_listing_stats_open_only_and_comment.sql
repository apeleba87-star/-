-- 현장 거래 건수: 진행중(status=open)인 건만 집계
CREATE OR REPLACE FUNCTION public.refresh_listing_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*)::INT INTO cnt
  FROM listings
  WHERE listing_type IN ('referral_regular', 'referral_one_time', 'sale_regular', 'subcontract')
    AND status = 'open';
  INSERT INTO listing_stats (id, total_count, updated_at)
  VALUES (1, cnt, NOW())
  ON CONFLICT (id) DO UPDATE SET total_count = EXCLUDED.total_count, updated_at = EXCLUDED.updated_at;
END;
$$;

COMMENT ON TABLE listing_stats IS '홈 대시보드용: 진행중(status=open)인 현장거래 건수만 집계';
