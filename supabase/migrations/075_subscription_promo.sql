-- 이벤트성 프로모: 첫 N개월 특가(예: 100원), 이후 정상가. 기간 제한 가능.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS promo_remaining_months INT DEFAULT NULL;

COMMENT ON COLUMN public.subscriptions.promo_remaining_months IS '프로모 적용 잔여 개월 수. 0 이상이면 해당 월에는 프로모 금액으로 결제 후 1 감소. NULL이면 프로모 미적용.';

-- app_settings에 프로모 설정 (JSON): enabled, amount_cents, months, start_date, end_date
INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
  'subscription_promo',
  '{"enabled":false,"amount_cents":100,"months":3,"start_date":null,"end_date":null}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
