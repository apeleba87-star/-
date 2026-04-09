-- 홈: 런타임 입찰 대량 조회 제거 — G2B/집계 크론이 JSON 스냅샷 채움
ALTER TABLE public.home_tender_stats
  ADD COLUMN IF NOT EXISTS spotlight_json JSONB,
  ADD COLUMN IF NOT EXISTS recent_tenders_json JSONB;

COMMENT ON COLUMN public.home_tender_stats.spotlight_json IS '히어로 스포트라이트(집계 시점 기준). 크론에서 갱신';
COMMENT ON COLUMN public.home_tender_stats.recent_tenders_json IS '홈 입찰 미리보기 행 배열. 크론에서 갱신';

-- 데이터랩·트러스트 스트립용: 오늘 발행 수 + 최근 글 5건 미리보기
CREATE TABLE IF NOT EXISTS public.home_content_stats (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  posts_today_count INT NOT NULL DEFAULT 0,
  posts_preview JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.home_content_stats IS '홈용: posts 오늘 건수·최근 5건 미리보기. 크론에서만 갱신';

ALTER TABLE public.home_content_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_content_stats_read" ON public.home_content_stats;
CREATE POLICY "home_content_stats_read" ON public.home_content_stats FOR SELECT USING (true);

INSERT INTO public.home_content_stats (id, posts_today_count, posts_preview, updated_at)
VALUES (1, 0, '[]'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;
