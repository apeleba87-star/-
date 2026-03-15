-- 입찰 리포트: 발행 시점 데이터를 고정하여, 이후 tenders 삭제/정리와 무관하게 표시
-- source_type = 'auto_tender_daily' 인 post에만 사용. DailyTenderPayload JSON 저장.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS report_snapshot JSONB;

COMMENT ON COLUMN public.posts.report_snapshot IS '입찰 리포트 발행 시점 집계 스냅샷. 있으면 표시 시 live 조회 대신 사용(데이터 삭제 후에도 유지).';
