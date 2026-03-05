-- 견적 계산기용 단가·상수 (관리자 설정, 공개 읽기)
CREATE TABLE IF NOT EXISTS public.estimate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.estimate_config IS '견적 계산기: 평당·옵션 단가 등 (단일 행 사용)';

-- 단일 행 초기값 (고정 id로 중복 방지)
INSERT INTO public.estimate_config (id, config)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '{
    "office_avg_unit_by_visits": [2000, 1850, 1750, 1650, 1550, 1480, 1420],
    "stairs_base_monthly": 80000,
    "stairs_extra_per_floor": 20000,
    "stairs_visit_multiplier": [1.0, 1.9, 2.7],
    "office_restroom_per_unit": 10000,
    "office_recycle_monthly": 15000,
    "office_elevator_monthly": 15000,
    "stairs_restroom_unit": 20000,
    "stairs_elevator_monthly": 15000,
    "stairs_parking_monthly": 10000,
    "stairs_window_monthly": 5000,
    "stairs_recycle_monthly": 15000
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW();

ALTER TABLE public.estimate_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimate_config_read" ON estimate_config FOR SELECT USING (true);
CREATE POLICY "estimate_config_admin" ON estimate_config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
