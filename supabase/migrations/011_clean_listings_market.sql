-- 청소업 현장 공유 / 구인 플랫폼 + 시장 평균 단가 분석 + 등급 시스템
-- listings: 5종 게시글 타입, 지급 단위(일당/반당/시급), 환산 필드
-- market_benchmarks: 지역·카테고리·단위별 평균
-- seller_metrics: 사장 등급 집계

-- 카테고리 (확장 가능): main / sub
CREATE TABLE IF NOT EXISTS public.listing_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('main', 'sub')),
  parent_id UUID REFERENCES listing_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_categories_kind ON listing_categories(kind);
CREATE INDEX IF NOT EXISTS idx_listing_categories_parent ON listing_categories(parent_id);

-- 시드: main
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order) VALUES
  ('main', NULL, 'general', '일반청소', 1),
  ('main', NULL, 'special', '특수청소', 2),
  ('main', NULL, 'regular', '정기청소', 3),
  ('main', NULL, 'one_time', '일회성청소', 4)
ON CONFLICT (slug) DO NOTHING;

-- 시드: sub (parent_id = main id)
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'office', '사무실청소', 1 FROM listing_categories c WHERE c.slug = 'general' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'kindergarten', '어린이집청소', 2 FROM listing_categories c WHERE c.slug = 'general' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'window', '유리창청소', 1 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'high_altitude', '고소작업', 2 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'move_in', '입주청소', 3 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'completion', '준공청소', 4 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'floor', '바닥청소', 5 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'exterior', '외벽청소', 6 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'toy_wash', '장난감세척', 7 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO listing_categories (kind, parent_id, slug, name, sort_order)
SELECT 'sub', c.id, 'disinfection', '소독', 8 FROM listing_categories c WHERE c.slug = 'special' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- 게시글 (5종 타입)
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN (
    'sale_regular', 'referral_regular', 'referral_one_time', 'job_posting', 'subcontract'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  title TEXT NOT NULL,
  body TEXT,
  region TEXT NOT NULL,
  category_main TEXT NOT NULL,
  category_sub TEXT,
  skill_level TEXT,
  pay_amount NUMERIC NOT NULL,
  pay_unit TEXT NOT NULL CHECK (pay_unit IN ('day', 'half_day', 'hour')),
  normalized_daily_wage NUMERIC,
  normalized_hourly_wage NUMERIC,
  contact_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_region ON listings(region);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_main, category_sub);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);

-- 시장 평균 (지역·카테고리·단위별)
CREATE TABLE IF NOT EXISTS public.market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  category_main TEXT NOT NULL,
  category_sub TEXT NOT NULL DEFAULT '',
  pay_unit TEXT NOT NULL CHECK (pay_unit IN ('day', 'half_day', 'hour')),
  skill_level TEXT NOT NULL DEFAULT '',
  sample_count INT NOT NULL DEFAULT 0,
  average_pay NUMERIC,
  average_normalized_daily_wage NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region, category_main, category_sub, pay_unit, skill_level)
);

CREATE INDEX IF NOT EXISTS idx_market_benchmarks_lookup ON market_benchmarks(region, category_main, category_sub, pay_unit);

-- 사장 등급 집계
CREATE TABLE IF NOT EXISTS public.seller_metrics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_score NUMERIC NOT NULL DEFAULT 0,
  seller_grade TEXT NOT NULL DEFAULT 'N' CHECK (seller_grade IN ('S', 'A', 'B', 'C', 'D', 'N')),
  avg_listing_grade_score NUMERIC,
  avg_job_wage_score NUMERIC,
  closing_rate NUMERIC,
  completion_rate NUMERIC,
  average_review_rating NUMERIC,
  total_review_count INT NOT NULL DEFAULT 0,
  no_show_rate NUMERIC,
  cancel_rate NUMERIC,
  incident_report_count INT NOT NULL DEFAULT 0,
  premium_quality_ratio NUMERIC,
  listing_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_metrics_grade ON seller_metrics(seller_grade);
CREATE INDEX IF NOT EXISTS idx_seller_metrics_score ON seller_metrics(seller_score DESC);

-- 리스팅 후기 (listings 전용; ugc도 활용 가능하나 명시 테이블)
CREATE TABLE IF NOT EXISTS public.listing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing ON listing_reviews(listing_id);

-- 리스팅 문제/신고 (노쇼, 지급불이행 등)
CREATE TABLE IF NOT EXISTS public.listing_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('no_show', 'non_payment', 'mismatch', 'no_contact', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_incidents_listing ON listing_incidents(listing_id);

-- RLS
ALTER TABLE public.listing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_categories_read" ON listing_categories FOR SELECT USING (true);

CREATE POLICY "listings_read" ON listings FOR SELECT USING (true);
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings_update_own" ON listings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "market_benchmarks_read" ON market_benchmarks FOR SELECT USING (true);

CREATE POLICY "seller_metrics_read" ON seller_metrics FOR SELECT USING (true);

CREATE POLICY "listing_reviews_read" ON listing_reviews FOR SELECT USING (true);
CREATE POLICY "listing_reviews_insert" ON listing_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id OR reviewer_id IS NULL);

CREATE POLICY "listing_incidents_read" ON listing_incidents FOR SELECT USING (true);
CREATE POLICY "listing_incidents_insert" ON listing_incidents FOR INSERT WITH CHECK (true);

-- normalized_daily_wage 자동 계산 트리거 (insert/update 시)
CREATE OR REPLACE FUNCTION public.listings_normalize_wage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pay_unit = 'day' THEN
    NEW.normalized_daily_wage := NEW.pay_amount;
    NEW.normalized_hourly_wage := NEW.pay_amount / 8;
  ELSIF NEW.pay_unit = 'half_day' THEN
    NEW.normalized_daily_wage := NEW.pay_amount * 2;
    NEW.normalized_hourly_wage := NEW.pay_amount / 4;
  ELSIF NEW.pay_unit = 'hour' THEN
    NEW.normalized_hourly_wage := NEW.pay_amount;
    NEW.normalized_daily_wage := NEW.pay_amount * 8;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_normalize_wage_trigger ON listings;
CREATE TRIGGER listings_normalize_wage_trigger
  BEFORE INSERT OR UPDATE OF pay_amount, pay_unit ON listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_normalize_wage();

-- 시장 평균 갱신 (listings 기준 집계)
CREATE OR REPLACE FUNCTION public.refresh_market_benchmarks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO market_benchmarks (
    region, category_main, category_sub, pay_unit, skill_level,
    sample_count, average_pay, average_normalized_daily_wage, updated_at
  )
  SELECT
    region,
    category_main,
    COALESCE(category_sub, ''),
    pay_unit,
    COALESCE(skill_level, ''),
    COUNT(*)::int,
    AVG(pay_amount),
    AVG(normalized_daily_wage),
    NOW()
  FROM listings
  WHERE status = 'open' AND normalized_daily_wage IS NOT NULL
  GROUP BY region, category_main, category_sub, pay_unit, skill_level
  ON CONFLICT (region, category_main, category_sub, pay_unit, skill_level)
  DO UPDATE SET
    sample_count = EXCLUDED.sample_count,
    average_pay = EXCLUDED.average_pay,
    average_normalized_daily_wage = EXCLUDED.average_normalized_daily_wage,
    updated_at = NOW();
END;
$$;
