-- 청소 질문 새 답변 알림 kind

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
    'question_answer'
  ));
