-- 뉴스 목록 카드(히어로)는 excerpt의 "입찰 N건"에서 건수를 읽음. 집계 갱신 후 제목·요약·본문의 건수를 맞추고 스냅샷을 무효화.

SELECT public.refresh_tender_daily_aggregate('2026-03-26'::date);

UPDATE public.posts p
SET
  title = regexp_replace(p.title, '입찰\s*[\d,]+\s*건', '입찰 ' || agg.count_total::text || '건', 'g'),
  excerpt = CASE
    WHEN p.excerpt IS NOT NULL THEN
      regexp_replace(p.excerpt, '입찰\s*[\d,]+\s*건', '입찰 ' || agg.count_total::text || '건', 'g')
    ELSE p.excerpt
  END,
  body = CASE
    WHEN p.body IS NOT NULL THEN
      regexp_replace(p.body, '총 \*\*[\d,]+\s*건\*\*입니다', '총 **' || agg.count_total::text || '건**입니다', 'g')
    ELSE p.body
  END,
  report_snapshot = NULL
FROM public.tender_daily_aggregates agg
WHERE p.source_type = 'auto_tender_daily'
  AND p.source_ref = '2026-03-26'
  AND agg.day_kst = '2026-03-26'::date;
