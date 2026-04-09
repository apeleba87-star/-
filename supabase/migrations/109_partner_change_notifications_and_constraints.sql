-- 협력센터 변경요청 알림/제약 보강

-- user_notifications.kind에 협력센터 변경요청 결과 추가
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
    'partner_change'
  ));

-- partner_contact_events.event_type 제약을 detail_view 포함으로 갱신
DO $$
DECLARE
  c_name TEXT;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.partner_contact_events'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%event_type%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.partner_contact_events DROP CONSTRAINT %I', c_name);
  END IF;

  ALTER TABLE public.partner_contact_events
    ADD CONSTRAINT partner_contact_events_event_type_check
    CHECK (event_type IN ('detail_view', 'contact_click'));
END $$;
