-- Newslett 초기 스키마
-- Supabase 대시보드 SQL Editor에서 실행하거나: supabase db push

-- 프로필 (Auth.users 확장)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'editor', 'admin')),
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 콘텐츠 카테고리 (약품/장비/근로/업계이슈)
CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO content_categories (slug, name, sort_order) VALUES
  ('chemical', '약품', 1),
  ('equipment', '장비', 2),
  ('labor', '근로', 3),
  ('industry', '업계이슈', 4)
ON CONFLICT (slug) DO NOTHING;

-- CMS 글 (운영자 콘텐츠)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES content_categories(id),
  title TEXT NOT NULL,
  slug TEXT,
  body TEXT,
  excerpt TEXT,
  newsletter_include BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);

-- 나라장터 입찰 공고 스냅샷
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  title TEXT,
  org_name TEXT,
  region TEXT,
  category TEXT,
  budget_amount BIGINT,
  deadline_at TIMESTAMPTZ,
  url TEXT,
  raw JSONB,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UTC 기준 날짜 표현식(IMMUTABLE)으로 유니크 인덱스 생성 (타임존 의존 표현식은 인덱스 불가)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_external_collected_date ON bids (external_id, ((collected_at AT TIME ZONE 'UTC')::date));
CREATE INDEX IF NOT EXISTS idx_bids_collected ON bids(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_region ON bids(region);

-- UGC (현장/후기/이슈제보)
CREATE TABLE IF NOT EXISTS public.ugc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('field', 'review', 'issue')),
  user_id UUID REFERENCES auth.users(id),
  -- 현장
  region TEXT,
  area_sqm NUMERIC,
  frequency TEXT,
  price_per_pyeong NUMERIC,
  scope TEXT,
  -- 후기
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  target_type TEXT,
  target_id UUID,
  -- 이슈
  issue_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ugc_status ON ugc(status);
CREATE INDEX IF NOT EXISTS idx_ugc_type ON ugc(type);
CREATE INDEX IF NOT EXISTS idx_ugc_created ON ugc(created_at DESC);

-- 지역/업종별 평균 (등급 산정용)
CREATE TABLE IF NOT EXISTS public.region_avg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  job_type TEXT,
  avg_price_per_pyeong NUMERIC NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region, job_type)
);

-- 뉴스레터 큐
CREATE TABLE IF NOT EXISTS public.newsletter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('auto', 'manual', 'ugc')),
  ref_type TEXT,
  ref_id UUID,
  title TEXT,
  summary TEXT,
  content_html TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  scheduled_for DATE NOT NULL DEFAULT CURRENT_DATE,
  used_in_issue_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON newsletter_queue(scheduled_for, used_in_issue_id);

-- 뉴스레터 회차
CREATE TABLE IF NOT EXISTS public.newsletter_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number INT,
  subject TEXT NOT NULL,
  summary TEXT,
  body_html TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_sent ON newsletter_issues(sent_at DESC);

-- 신고
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('ugc', 'post')),
  target_id UUID NOT NULL,
  reporter_id UUID REFERENCES auth.users(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 광고 슬롯
CREATE TABLE IF NOT EXISTS public.ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES newsletter_issues(id),
  slot_index INT NOT NULL DEFAULT 0,
  advertiser_name TEXT,
  link_url TEXT,
  image_url TEXT,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 구독자(이메일만 뉴스레터 수신용, Auth와 별도)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_avg ENABLE ROW LEVEL SECURITY;

-- 공개 읽기: 카테고리, 게시글(발행된 것), 이슈(발송된 것), UGC(approved만)
CREATE POLICY "categories_read" ON content_categories FOR SELECT USING (true);
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (published_at IS NOT NULL);
CREATE POLICY "bids_read" ON bids FOR SELECT USING (true);
CREATE POLICY "issues_public_read" ON newsletter_issues FOR SELECT USING (sent_at IS NOT NULL);
CREATE POLICY "ugc_approved_read" ON ugc FOR SELECT USING (status = 'approved');
CREATE POLICY "region_avg_read" ON region_avg FOR SELECT USING (true);

-- 프로필: 본인 읽기/수정
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- 관리자: editor/admin만 posts, queue, ugc, reports, ad_slots 전체
CREATE POLICY "admin_posts" ON posts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_queue" ON newsletter_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_issues" ON newsletter_issues FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_ugc" ON ugc FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_reports" ON reports FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_ads" ON ad_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "admin_subscribers" ON newsletter_subscribers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- UGC: 로그인 사용자 insert, 본인 수정
CREATE POLICY "ugc_insert" ON ugc FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "ugc_own_update" ON ugc FOR UPDATE USING (auth.uid() = user_id);

-- 구독자: 관리자만 insert/update (일반 사용자는 API로 구독 요청 시 서버에서 insert)
CREATE POLICY "subscribers_admin" ON newsletter_subscribers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

-- 신고: 로그인 사용자 insert
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (true);

-- 새 사용자 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'subscriber');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
