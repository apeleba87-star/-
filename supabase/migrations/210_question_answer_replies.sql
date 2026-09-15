-- 답변 대댓글 (1단만: parent는 최상위 답변)

ALTER TABLE public.question_answers
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES public.question_answers (id) ON DELETE CASCADE;

COMMENT ON COLUMN public.question_answers.parent_id IS
  '대댓글이면 상위 답변 id. NULL이면 최상위 답변. 대댓글의 대댓글은 앱에서 금지.';

CREATE INDEX IF NOT EXISTS idx_question_answers_parent
  ON public.question_answers (parent_id, created_at ASC)
  WHERE deleted_at IS NULL AND status = 'published' AND parent_id IS NOT NULL;

-- 알림 kind: 대댓글
ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_kind_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_kind_check
  CHECK (kind IN (
    'tender_new',
    'tender_deadline',
    'job_application',
    'subscription',
    'system',
    'partner_change',
    'question_answer',
    'question_reply'
  ));
