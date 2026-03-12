-- 글 상세(포스트/리포트) 페이지 광고 슬롯 추가
-- docs/ad-placement-design.md

INSERT INTO public.home_ad_slots (key, name, enabled) VALUES
  ('post_top', '글 상세 상단 (본문 위)', true),
  ('post_bottom', '글 상세 하단 (본문 아래)', true)
ON CONFLICT (key) DO NOTHING;
