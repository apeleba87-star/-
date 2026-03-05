-- 홈 광고 슬롯(노출 on/off) + 캠페인(이미지·기간·대기순서)
-- 기존 ad_slots는 뉴스레터용으로 유지

-- 슬롯 정의: 프리미엄 배너(Hero 직후), 네이티브 카드(뉴스-현장공유 사이)
CREATE TABLE IF NOT EXISTS public.home_ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.home_ad_slots IS '홈 광고 슬롯: 켜면 해당 위치에 광고 노출, 끄면 빈칸';
COMMENT ON COLUMN public.home_ad_slots.key IS 'premium_banner | native_card';
COMMENT ON COLUMN public.home_ad_slots.enabled IS 'false면 해당 슬롯 자리 비움';

-- 슬롯별 캠페인: 이미지/기간/대기순서
CREATE TABLE IF NOT EXISTS public.home_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_ad_slot_id UUID NOT NULL REFERENCES public.home_ad_slots(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  cta_text TEXT,
  cta_url TEXT,
  image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_ad_campaigns_slot_dates ON home_ad_campaigns(home_ad_slot_id, start_date, end_date);
COMMENT ON TABLE public.home_ad_campaigns IS '홈 광고 캠페인: 기간 내 sort_order 우선으로 1건 노출';
COMMENT ON COLUMN public.home_ad_campaigns.sort_order IS '동일 기간 겹치면 낮은 수가 우선(대기순서)';

-- 초기 슬롯 2개
INSERT INTO public.home_ad_slots (key, name, enabled) VALUES
  ('premium_banner', '프리미엄 배너 (Hero 직후)', true),
  ('native_card', '네이티브 카드 (뉴스-현장공유 사이)', true)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.home_ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_ad_campaigns ENABLE ROW LEVEL SECURITY;

-- 공개: 홈에서 노출 여부·진행중 캠페인 조회
CREATE POLICY "home_ad_slots_read" ON home_ad_slots FOR SELECT USING (true);
CREATE POLICY "home_ad_campaigns_read" ON home_ad_campaigns FOR SELECT USING (true);

-- 관리자만 수정
CREATE POLICY "home_ad_slots_admin" ON home_ad_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "home_ad_campaigns_admin" ON home_ad_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
