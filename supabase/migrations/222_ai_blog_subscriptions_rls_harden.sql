-- AI 블로그 구독: 클라이언트는 SELECT만. INSERT/UPDATE는 service_role(API)만.
-- (이전: authenticated UPDATE로 amount_cents·status 조작 가능했음)

DROP POLICY IF EXISTS "ai_blog_subscriptions_own_update" ON public.ai_blog_subscriptions;
DROP POLICY IF EXISTS "ai_blog_subscriptions_insert_own" ON public.ai_blog_subscriptions;

DROP POLICY IF EXISTS "ai_blog_subscriptions_own_select" ON public.ai_blog_subscriptions;
CREATE POLICY "ai_blog_subscriptions_own_select" ON public.ai_blog_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.ai_blog_subscriptions FROM authenticated;
GRANT SELECT ON TABLE public.ai_blog_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_blog_subscriptions TO service_role;
