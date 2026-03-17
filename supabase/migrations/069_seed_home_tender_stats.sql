-- home_tender_stats 초기 행 삽입 (크론/갱신 전까지 0으로 표시, 갱신 시 덮어씀)
INSERT INTO public.home_tender_stats (id, open_count, today_count, industry_breakdown, recent_tender_ids, updated_at)
VALUES (1, 0, 0, '[]'::jsonb, '{}', NOW())
ON CONFLICT (id) DO NOTHING;
