-- 구독 결제 금액(원) 관리자 설정. app_settings에 없으면 기본 9900원 사용
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('subscription_amount_cents', to_jsonb(9900), NOW())
ON CONFLICT (key) DO NOTHING;
