-- 현장거래: 일당 없이 월 수금·매매가·배수만 사용. pay_unit에 'monthly' 추가.

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_pay_unit_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_pay_unit_check
  CHECK (pay_unit IN ('day', 'half_day', 'hour', 'monthly'));

COMMENT ON COLUMN public.listings.pay_unit IS 'day|half_day|hour: 일당/반당/시급. monthly: 월 수금(정기 매매/도급 등), normalized_daily_wage 미사용';

-- 트리거: pay_unit = 'monthly'이면 normalized_daily_wage 등 null 유지
CREATE OR REPLACE FUNCTION public.listings_normalize_wage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pay_unit = 'day' THEN
    NEW.normalized_daily_wage := NEW.pay_amount;
    NEW.normalized_hourly_wage := NEW.pay_amount / 8;
  ELSIF NEW.pay_unit = 'half_day' THEN
    NEW.normalized_daily_wage := NEW.pay_amount * 2;
    NEW.normalized_hourly_wage := NEW.pay_amount / 4;
  ELSIF NEW.pay_unit = 'hour' THEN
    NEW.normalized_hourly_wage := NEW.pay_amount;
    NEW.normalized_daily_wage := NEW.pay_amount * 8;
  ELSIF NEW.pay_unit = 'monthly' THEN
    NEW.normalized_daily_wage := NULL;
    NEW.normalized_hourly_wage := NULL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
