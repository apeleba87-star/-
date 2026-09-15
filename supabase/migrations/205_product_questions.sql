-- 제품 Q&A (멀티 브랜드·엔티티 태그). 즉시 공개 + 관리자 삭제·계정 정지.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS questions_suspended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.questions_suspended_at IS
  '질문게시판 이용 정지 시각 — 질문·답변 작성 차단';

CREATE TABLE IF NOT EXISTS public.questions (
  id BIGSERIAL PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'deleted')),
  answer_count INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT questions_title_len CHECK (char_length(title) BETWEEN 4 AND 200),
  CONSTRAINT questions_body_len CHECK (char_length(body) BETWEEN 10 AND 10000),
  CONSTRAINT questions_slug_len CHECK (char_length(slug) BETWEEN 1 AND 120)
);

COMMENT ON TABLE public.questions IS '제품·지식 Q&A 질문 — SEO 독립 페이지';

CREATE INDEX IF NOT EXISTS idx_questions_status_created
  ON public.questions (status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_questions_author_created
  ON public.questions (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id BIGINT NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'deleted')),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_answers_body_len CHECK (char_length(body) BETWEEN 2 AND 10000)
);

COMMENT ON TABLE public.question_answers IS '질문 답변 — is_official은 관리자 수동 표시';

CREATE INDEX IF NOT EXISTS idx_question_answers_question_created
  ON public.question_answers (question_id, created_at ASC)
  WHERE deleted_at IS NULL AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_question_answers_author_created
  ON public.question_answers (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.question_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id BIGINT NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('product', 'contaminant', 'material', 'place', 'equipment')),
  entity_id TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, entity_type, entity_id)
);

COMMENT ON TABLE public.question_entity_links IS
  '질문 ↔ 지식 엔티티 ID 연결 (문자열 태그 금지)';

CREATE INDEX IF NOT EXISTS idx_question_entity_links_entity
  ON public.question_entity_links (entity_type, entity_id, question_id);

CREATE INDEX IF NOT EXISTS idx_question_entity_links_question
  ON public.question_entity_links (question_id);

CREATE OR REPLACE FUNCTION public.questions_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.questions_touch_updated_at();

DROP TRIGGER IF EXISTS trg_question_answers_updated_at ON public.question_answers;
CREATE TRIGGER trg_question_answers_updated_at
  BEFORE UPDATE ON public.question_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.questions_touch_updated_at();

CREATE OR REPLACE FUNCTION public.question_answers_sync_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qid BIGINT;
BEGIN
  qid := COALESCE(NEW.question_id, OLD.question_id);
  UPDATE public.questions
  SET answer_count = (
    SELECT COUNT(*)::INT
    FROM public.question_answers a
    WHERE a.question_id = qid
      AND a.deleted_at IS NULL
      AND a.status = 'published'
  ),
  updated_at = NOW()
  WHERE id = qid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_question_answers_sync_count ON public.question_answers;
CREATE TRIGGER trg_question_answers_sync_count
  AFTER INSERT OR UPDATE OR DELETE ON public.question_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.question_answers_sync_count();

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_entity_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_public_read" ON public.questions;
CREATE POLICY "questions_public_read" ON public.questions
  FOR SELECT USING (
    status = 'published'
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "questions_author_insert" ON public.questions;
CREATE POLICY "questions_author_insert" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.questions_suspended_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "questions_admin_all" ON public.questions;
CREATE POLICY "questions_admin_all" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "question_answers_public_read" ON public.question_answers;
CREATE POLICY "question_answers_public_read" ON public.question_answers
  FOR SELECT USING (
    status = 'published'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
        AND q.status = 'published'
        AND q.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "question_answers_author_insert" ON public.question_answers;
CREATE POLICY "question_answers_author_insert" ON public.question_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.questions_suspended_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "question_answers_admin_all" ON public.question_answers;
CREATE POLICY "question_answers_admin_all" ON public.question_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "question_entity_links_public_read" ON public.question_entity_links;
CREATE POLICY "question_entity_links_public_read" ON public.question_entity_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
        AND q.status = 'published'
        AND q.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "question_entity_links_author_insert" ON public.question_entity_links;
CREATE POLICY "question_entity_links_author_insert" ON public.question_entity_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
        AND q.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "question_entity_links_admin_all" ON public.question_entity_links;
CREATE POLICY "question_entity_links_admin_all" ON public.question_entity_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

GRANT SELECT ON public.questions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.questions TO authenticated;
GRANT SELECT ON public.question_answers TO anon, authenticated;
GRANT INSERT, UPDATE ON public.question_answers TO authenticated;
GRANT SELECT ON public.question_entity_links TO anon, authenticated;
GRANT INSERT ON public.question_entity_links TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.questions_id_seq TO authenticated;
