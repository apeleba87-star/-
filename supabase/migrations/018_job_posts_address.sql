-- job_posts에 현장 상세 주소(공개용) 추가
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.job_posts.address IS '현장 상세 주소 (공개)';
