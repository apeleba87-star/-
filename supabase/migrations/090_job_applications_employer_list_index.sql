-- 구인자 "전체 지원자" 목록: position_id + created_at 정렬·페이지네이션에 유리
CREATE INDEX IF NOT EXISTS idx_job_applications_position_created_at
  ON public.job_applications (position_id, created_at DESC);
