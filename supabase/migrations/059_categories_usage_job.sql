-- 현장거래/인력구인 카테고리 분리: usage에 'job' 추가

-- 1. usage CHECK에 'job' 포함 (기존 제약 제거 후 재생성)
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_usage_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_usage_check
  CHECK (usage IN ('default', 'listing', 'job'));

COMMENT ON COLUMN public.categories.usage IS 'default: 공통/기본. listing: 현장거래 전용. job: 인력구인 전용';
