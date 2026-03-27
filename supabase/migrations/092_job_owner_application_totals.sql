-- 내 구인 구인자 기준 전체 지원·미확정 건수 (전체 지원자 탭 헤더용, 포지션 목록 없이 집계)
CREATE OR REPLACE FUNCTION public.get_job_owner_application_totals(p_owner_user_id uuid)
RETURNS TABLE(total_count bigint, pending_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(ja.id)::bigint,
    COUNT(ja.id) FILTER (WHERE ja.status IN ('applied', 'reviewing'))::bigint
  FROM public.job_applications ja
  INNER JOIN public.job_post_positions p ON p.id = ja.position_id
  INNER JOIN public.job_posts jp ON jp.id = p.job_post_id
  WHERE jp.user_id = p_owner_user_id
    AND p_owner_user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_job_owner_application_totals(uuid) IS '구인자 소유 포지션에 달린 지원 전체·미확정 건수 (RLS 우회, 본인만)';

REVOKE ALL ON FUNCTION public.get_job_owner_application_totals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_owner_application_totals(uuid) TO authenticated;
