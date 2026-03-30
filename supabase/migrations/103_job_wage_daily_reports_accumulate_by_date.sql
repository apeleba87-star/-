-- 일당 리포트: report_date(PK)당 1행 유지, 앱에서 전역 삭제 없이 upsert만 사용
COMMENT ON TABLE public.job_wage_daily_reports IS
  '구인 일당 스냅샷. report_date(집계 말일·KST)당 1행, 같은 날 재집계 시 해당 행만 갱신.';
