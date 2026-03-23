-- 외부/대량 등록 시 원본 게시일(벤치마크·집계용). NULL이면 created_at 기준.
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS external_registered_at DATE;

COMMENT ON COLUMN public.job_posts.external_registered_at IS
  '외부 출처에서의 원 등록일(엑셀 대량 등). 평균 단가 집계 시 참고. 미입력 시 시스템 등록일(created_at) 사용';
