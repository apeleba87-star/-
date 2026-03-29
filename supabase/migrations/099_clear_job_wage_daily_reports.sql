-- 일당 리포트: "30일치"를 일별 스냅샷으로 쌓인 데이터 제거.
-- 이후 설계는 기간(예: 30일)을 한 번에 집계한 단일 리포트로 전환 예정.

DELETE FROM public.job_wage_daily_reports;
