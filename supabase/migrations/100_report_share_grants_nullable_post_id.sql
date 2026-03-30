-- 일당 리포트 등 post가 없는 화면에서도 동일 (user_id, grant_date) 행으로 공유 열람을 기록하기 위해 post_id nullable
ALTER TABLE public.report_share_grants
  ALTER COLUMN post_id DROP NOT NULL;

COMMENT ON COLUMN public.report_share_grants.post_id IS '최초 공유가 입찰 리포트(post)인 경우 posts.id. 일당 리포트만 공유한 경우 NULL.';
