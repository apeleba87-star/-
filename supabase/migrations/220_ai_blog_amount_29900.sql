-- AI 블로그 정상 월 금액 29,900원으로 확정
UPDATE public.app_settings
SET value = to_jsonb(29900), updated_at = NOW()
WHERE key = 'ai_blog_amount_cents';

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('ai_blog_amount_cents', to_jsonb(29900), NOW())
ON CONFLICT (key) DO UPDATE
SET value = to_jsonb(29900), updated_at = NOW();

UPDATE cleanidex.ai_plans
SET monthly_price_krw = 29900, updated_at = NOW()
WHERE code = 'PRO';
