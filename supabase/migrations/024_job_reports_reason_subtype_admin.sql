-- 노쇼 신고 세부 사유 + 관리자 조회 허용

-- reason_subtype: 당일 무단 결근(no_show_absent), 업무 중간 이탈(no_show_left), 기타(no_show_other)
ALTER TABLE public.job_reports
  ADD COLUMN IF NOT EXISTS reason_subtype TEXT
  CHECK (reason_subtype IS NULL OR reason_subtype IN ('no_show_absent', 'no_show_left', 'no_show_other'));

COMMENT ON COLUMN public.job_reports.reason_subtype IS '노쇼 시 세부: no_show_absent(당일 무단 결근), no_show_left(업무 중간 이탈), no_show_other(기타)';

-- 관리자: job_reports 전체 조회 (노쇼 신고 기록 관리)
CREATE POLICY "job_reports_select_admin" ON public.job_reports
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

COMMENT ON POLICY "job_reports_select_admin" ON public.job_reports IS '관리자 노쇼 신고 기록 조회';
