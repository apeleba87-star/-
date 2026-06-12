-- 채용 공고(워크넷) 공개 페이지 광고 슬롯

INSERT INTO public.home_ad_slots (key, name, enabled, slot_type) VALUES
  (
    'jobs_public_detail_summary_below',
    '채용 공고 상세 · 요약 아래',
    true,
    'coupang'
  ),
  (
    'jobs_public_detail_related_above',
    '채용 공고 상세 · 같은 지역 공고 위',
    true,
    'coupang'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name;
