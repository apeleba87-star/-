-- 피신고자(reported_user_id)가 status, rescinded_at을 변경하지 못하도록 트리거
-- 피신고자는 appealed_at, appeal_text만 이의 제기로 업데이트 가능

CREATE OR REPLACE FUNCTION public.job_reports_deny_reported_user_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.reported_user_id = auth.uid() AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.rescinded_at IS DISTINCT FROM OLD.rescinded_at
  ) THEN
    RAISE EXCEPTION '피신고자는 신고 상태(status) 또는 철회(rescinded_at)를 변경할 수 없습니다.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_reports_deny_reported_status_trigger ON public.job_reports;
CREATE TRIGGER job_reports_deny_reported_status_trigger
  BEFORE UPDATE ON public.job_reports
  FOR EACH ROW EXECUTE FUNCTION public.job_reports_deny_reported_user_status_change();

COMMENT ON FUNCTION public.job_reports_deny_reported_user_status_change() IS 'RLS로 피신고자도 UPDATE 가능하므로, 피신고자가 status/rescinded_at 변경 시 차단';
