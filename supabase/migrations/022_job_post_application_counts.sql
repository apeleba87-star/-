-- 구인글 목록에서 "지원 N명" 표시용: 글별 지원자 수만 반환 (anon 호출 가능)
CREATE OR REPLACE FUNCTION public.get_job_post_application_counts(post_ids UUID[])
RETURNS TABLE(job_post_id UUID, application_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.job_post_id, COUNT(a.id)::BIGINT
  FROM job_post_positions p
  LEFT JOIN job_applications a ON a.position_id = p.id
    AND a.status IN ('applied', 'reviewing', 'accepted')
  WHERE p.job_post_id = ANY(post_ids)
  GROUP BY p.job_post_id;
$$;

COMMENT ON FUNCTION public.get_job_post_application_counts(UUID[]) IS '구인글별 지원자 수 (목록 노출용, RLS 우회)';
