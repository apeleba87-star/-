-- 내 구인 관리: user_id + status + created_at 목록/페이지네이션
CREATE INDEX IF NOT EXISTS idx_job_posts_user_status_created_desc
  ON public.job_posts (user_id, status, created_at DESC);

-- 아카이브: 마감 + 작업일 필터
CREATE INDEX IF NOT EXISTS idx_job_posts_user_closed_work_date
  ON public.job_posts (user_id, work_date DESC)
  WHERE status = 'closed' AND work_date IS NOT NULL;
