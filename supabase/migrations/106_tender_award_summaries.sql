-- 사용자 노출용 낙찰·개찰 요약 (원문은 tender_award_raw에만). 공고 상세 등에서 SELECT.

CREATE TABLE IF NOT EXISTS public.tender_award_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL,
  source_record_id text NOT NULL,
  tender_id uuid REFERENCES public.tenders (id) ON DELETE SET NULL,
  bid_ntce_no text NOT NULL,
  bid_ntce_ord text NOT NULL,
  bid_clsfc_no text,
  rbid_no text,
  bid_ntce_nm text,
  openg_dt timestamptz,
  sucsfbider_nm text,
  sucsfbid_amt bigint,
  presmpt_prce bigint,
  bid_rate_pct numeric(8, 4),
  prtcpt_cnum integer,
  rate_band text,
  competition_summary text,
  categories text[] NOT NULL DEFAULT '{}',
  is_clean_related boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tender_award_summaries_source_unique UNIQUE (source_slug, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_tender_award_summaries_tender_id
  ON public.tender_award_summaries (tender_id)
  WHERE tender_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tender_award_summaries_bid
  ON public.tender_award_summaries (bid_ntce_no, bid_ntce_ord);

CREATE INDEX IF NOT EXISTS idx_tender_award_summaries_openg
  ON public.tender_award_summaries (openg_dt DESC NULLS LAST)
  WHERE is_clean_related = true;

COMMENT ON TABLE public.tender_award_summaries IS
  '낙찰 API에서 추출한 표시용 필드만. payload 없음. anon은 SELECT만(RLS).';

ALTER TABLE public.tender_award_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tender_award_summaries_select_all"
  ON public.tender_award_summaries
  FOR SELECT
  USING (true);

-- INSERT/UPDATE 정책 없음 → service_role·마이그레이션만 쓰기 가능
