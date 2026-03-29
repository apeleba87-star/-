-- 일당 리포트: 앱에서 KST 30일 구간을 한 번에 집계해 단일 행으로 유지(갱신 시 전체 삭제 후 삽입).

COMMENT ON TABLE public.job_wage_daily_reports IS
  '구인 신규 포지션 기준 일당: KST 달력 30일 구간을 한 번에 집계한 스냅샷(보통 1행, report_date=구간 말일)';
