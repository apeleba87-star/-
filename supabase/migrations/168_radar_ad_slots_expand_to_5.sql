-- 배너당 슬롯 3 → 5, KST 일별 impression 집계 RPC (로테이션 균형)

ALTER TABLE public.radar_ad_slots
  DROP CONSTRAINT IF EXISTS radar_ad_slots_slot_index_check;

ALTER TABLE public.radar_ad_slots
  ADD CONSTRAINT radar_ad_slots_slot_index_check
  CHECK (slot_index BETWEEN 1 AND 5);

COMMENT ON TABLE public.radar_ad_slots IS '배너당 슬롯 1~5 — 화면에서 로테이션';

CREATE OR REPLACE FUNCTION public.radar_ad_impression_counts_for_date(
  p_slot_ids UUID[],
  p_stats_date DATE
)
RETURNS TABLE(slot_id UUID, impression_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.slot_id, COUNT(*)::BIGINT AS impression_count
  FROM public.radar_ad_events e
  WHERE e.slot_id = ANY(p_slot_ids)
    AND e.event_type = 'impression'
    AND e.created_at >= (p_stats_date::TEXT || 'T00:00:00+09:00')::TIMESTAMPTZ
    AND e.created_at <= (p_stats_date::TEXT || 'T23:59:59.999+09:00')::TIMESTAMPTZ
  GROUP BY e.slot_id;
$$;

COMMENT ON FUNCTION public.radar_ad_impression_counts_for_date IS
  '슬롯별 KST 일자 impression 수 — 입주레이더 배너 로테이션 균형용';

GRANT EXECUTE ON FUNCTION public.radar_ad_impression_counts_for_date(UUID[], DATE) TO service_role;
