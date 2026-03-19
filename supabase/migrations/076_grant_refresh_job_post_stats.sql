-- 구인 등록/수정/마감 시 서버 액션에서 refresh_job_post_stats() 호출 가능하도록 EXECUTE 부여
GRANT EXECUTE ON FUNCTION public.refresh_job_post_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_job_post_stats() TO service_role;
