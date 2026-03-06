-- 일정(작업 예정일) 필드 추가
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS work_date DATE;

CREATE INDEX IF NOT EXISTS idx_listings_work_date ON listings(work_date);
