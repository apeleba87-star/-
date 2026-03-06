-- 청소 카테고리 관리형 시스템: categories 테이블 + listings/market_benchmarks ID 연동
-- 기존 listing_categories 데이터를 categories로 이전, 기존 게시글/통계 유지

-- 1. categories 테이블 (parent_id NULL = 대분류, 값 있음 = 소분류)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;

-- 2. listing_categories → categories 데이터 이전 (main 먼저, sub는 parent 매핑)
INSERT INTO categories (id, name, parent_id, slug, sort_order, is_active, updated_at)
SELECT id, name, NULL, slug, sort_order, true, NOW()
FROM listing_categories
WHERE kind = 'main'
ON CONFLICT (slug) DO NOTHING;

-- sub: parent_id를 새 categories.id로 매핑 (listing_categories.parent_id = main.id 이므로 동일 id 사용 가능)
-- 단, 위에서 main을 넣을 때 id를 그대로 가져왔으므로, sub의 parent_id는 이미 main의 id와 동일
INSERT INTO categories (id, name, parent_id, slug, sort_order, is_active, updated_at)
SELECT
  lc.id,
  lc.name,
  lc.parent_id,
  lc.slug,
  lc.sort_order,
  true,
  NOW()
FROM listing_categories lc
WHERE lc.kind = 'sub' AND lc.parent_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM categories c WHERE c.id = lc.parent_id)
ON CONFLICT (slug) DO NOTHING;

-- 3. listings에 category_main_id, category_sub_id, custom_subcategory_text 추가
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS category_main_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_sub_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_subcategory_text TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_category_main ON listings(category_main_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_sub ON listings(category_sub_id);

-- 기존 category_main/category_sub 텍스트로 ID 백필
UPDATE listings l
SET
  category_main_id = (SELECT c.id FROM categories c WHERE c.parent_id IS NULL AND (c.slug = l.category_main OR c.name = l.category_main) LIMIT 1),
  category_sub_id = (
    SELECT c.id FROM categories c
    WHERE c.parent_id = (SELECT c2.id FROM categories c2 WHERE c2.parent_id IS NULL AND (c2.slug = l.category_main OR c2.name = l.category_main) LIMIT 1)
      AND (c.slug = l.category_sub OR c.name = l.category_sub)
    LIMIT 1
  )
WHERE l.category_main IS NOT NULL AND l.category_main <> '';

-- category_main_id만 채우고 sub는 매칭 실패 시 NULL 유지 (이미 위에서 처리)
-- category_main, category_sub 컬럼 유지 (하위 호환용 표시), nullable로 변경
ALTER TABLE public.listings
  ALTER COLUMN category_main DROP NOT NULL;

-- 트리거: category_main_id / category_sub_id 변경 시 category_main, category_sub 텍스트 동기화
CREATE OR REPLACE FUNCTION public.sync_listing_category_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_main_id IS NOT NULL THEN
    SELECT slug INTO NEW.category_main FROM categories WHERE id = NEW.category_main_id;
  ELSE
    NEW.category_main := NULL;
  END IF;
  IF NEW.category_sub_id IS NOT NULL THEN
    SELECT slug INTO NEW.category_sub FROM categories WHERE id = NEW.category_sub_id;
  ELSE
    NEW.category_sub := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_listing_category_text_trigger ON listings;
CREATE TRIGGER sync_listing_category_text_trigger
  BEFORE INSERT OR UPDATE OF category_main_id, category_sub_id ON listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_category_text();

-- 기존 데이터에 대해 category_main/category_sub 텍스트 동기화 (트리거 유발)
UPDATE listings SET category_main_id = category_main_id
WHERE category_main_id IS NOT NULL;

-- 4. market_benchmarks: category_main_id, category_sub_id 추가 및 전환
ALTER TABLE public.market_benchmarks
  ADD COLUMN IF NOT EXISTS category_main_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category_sub_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- 기존 텍스트 기준으로 ID 백필
UPDATE market_benchmarks mb
SET category_main_id = (SELECT c.id FROM categories c WHERE c.parent_id IS NULL AND (c.slug = mb.category_main OR c.name = mb.category_main) LIMIT 1)
WHERE mb.category_main IS NOT NULL;

UPDATE market_benchmarks mb
SET category_sub_id = (
  SELECT c.id FROM categories c
  WHERE c.parent_id = mb.category_main_id AND mb.category_sub IS NOT NULL AND mb.category_sub <> ''
    AND (c.slug = mb.category_sub OR c.name = mb.category_sub)
  LIMIT 1
)
WHERE mb.category_main_id IS NOT NULL AND mb.category_sub IS NOT NULL AND mb.category_sub <> '';

UPDATE market_benchmarks SET category_sub_id = NULL WHERE category_sub IS NULL OR category_sub = '';

-- 기존 UNIQUE 제거 후 새 제약 (NULL 허용을 위해 expression unique index 사용)
-- 기존 UNIQUE 제약 제거 (이름은 PostgreSQL 기본 규칙)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'public.market_benchmarks'::regclass AND contype = 'u')
  LOOP
    EXECUTE format('ALTER TABLE public.market_benchmarks DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- expression unique: category_sub_id NULL을 하나로 취급
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_benchmarks_unique
  ON market_benchmarks (region, category_main_id, COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid), pay_unit, skill_level);

-- 기존 텍스트 컬럼 제거 (애플리케이션은 ID만 사용)
ALTER TABLE public.market_benchmarks DROP COLUMN IF EXISTS category_main;
ALTER TABLE public.market_benchmarks DROP COLUMN IF EXISTS category_sub;

CREATE INDEX IF NOT EXISTS idx_market_benchmarks_lookup_id ON market_benchmarks(region, category_main_id, category_sub_id, pay_unit);

-- 5. refresh_market_benchmarks: category_main_id, category_sub_id 기준 그룹핑 (custom_subcategory_text 미사용)
CREATE OR REPLACE FUNCTION public.refresh_market_benchmarks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO market_benchmarks (
    region, category_main_id, category_sub_id, pay_unit, skill_level,
    sample_count, average_pay, average_normalized_daily_wage, updated_at
  )
  SELECT
    region,
    category_main_id,
    category_sub_id,
    pay_unit,
    COALESCE(skill_level, ''),
    COUNT(*)::int,
    AVG(pay_amount),
    AVG(normalized_daily_wage),
    NOW()
  FROM listings
  WHERE status = 'open' AND normalized_daily_wage IS NOT NULL AND category_main_id IS NOT NULL
  GROUP BY region, category_main_id, category_sub_id, pay_unit, skill_level
  ON CONFLICT (region, category_main_id, COALESCE(category_sub_id, '00000000-0000-0000-0000-000000000000'::uuid), pay_unit, skill_level)
  DO UPDATE SET
    sample_count = EXCLUDED.sample_count,
    average_pay = EXCLUDED.average_pay,
    average_normalized_daily_wage = EXCLUDED.average_normalized_daily_wage,
    updated_at = NOW();
END;
$$;

-- 6. RLS: categories 읽기는 전체, 수정은 관리자만 (policy는 앱에서 admin 체크)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);

-- 관리자만 insert/update/delete (role은 app layer 또는 custom claim으로 체크)
CREATE POLICY "categories_admin_all" ON categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );
