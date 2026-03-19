-- 글 사용자 비공개: 업계소식에는 등록되지만 관리자에게만 노출
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.posts.is_private IS 'true면 업계소식·카테고리 목록에 안 보이고, 글 상세는 관리자만 접근 가능';

CREATE INDEX IF NOT EXISTS idx_posts_is_private ON public.posts(is_private) WHERE is_private = FALSE;
