-- 질문 게시판 보강: RLS 강화 + 조회수 쿨다운

-- 1) 질문 INSERT: published만, 카운트/라벨 위조 방지
DROP POLICY IF EXISTS "questions_author_insert" ON public.questions;
CREATE POLICY "questions_author_insert" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND status = 'published'
    AND deleted_at IS NULL
    AND COALESCE(answer_count, 0) = 0
    AND COALESCE(view_count, 0) = 0
    AND author_label IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.questions_suspended_at IS NOT NULL
    )
  );

-- 2) 답변 INSERT: is_official 은 staff만
DROP POLICY IF EXISTS "question_answers_author_insert" ON public.question_answers;
CREATE POLICY "question_answers_author_insert" ON public.question_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND status = 'published'
    AND deleted_at IS NULL
    AND (
      is_official = false
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'editor')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.questions_suspended_at IS NOT NULL
    )
  );

-- 3) 작성자 본인 글 삭제 (태그 연결 실패 시 롤백용)
DROP POLICY IF EXISTS "questions_author_delete" ON public.questions;
CREATE POLICY "questions_author_delete" ON public.questions
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

GRANT DELETE ON public.questions TO authenticated;

-- 4) 조회수 중복 방지 (글·시청자당 5분)
CREATE TABLE IF NOT EXISTS public.question_view_dedup (
  question_id BIGINT NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  last_counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (question_id, viewer_key)
);

CREATE INDEX IF NOT EXISTS idx_question_view_dedup_last_counted
  ON public.question_view_dedup (last_counted_at DESC);

COMMENT ON TABLE public.question_view_dedup IS
  '질문 조회수 중복 방지: (질문, viewer_key)별 마지막 집계 시각';

ALTER TABLE public.question_view_dedup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.question_view_dedup FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.record_question_view(
  p_question_id BIGINT,
  p_viewer_key TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_author uuid;
  v_count BIGINT;
  v_key TEXT;
  v_last TIMESTAMPTZ;
BEGIN
  SELECT q.author_id, COALESCE(q.view_count, 0)
  INTO v_author, v_count
  FROM public.questions q
  WHERE q.id = p_question_id
    AND q.status = 'published'
    AND q.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 작성자 본인 조회는 집계하지 않음
  IF v_uid IS NOT NULL AND v_uid = v_author THEN
    RETURN v_count;
  END IF;

  v_key := NULLIF(TRIM(p_viewer_key), '');
  IF v_key IS NULL AND v_uid IS NOT NULL THEN
    v_key := 'u:' || v_uid::text;
  END IF;
  IF v_key IS NULL THEN
    -- 식별 불가(익명·키 없음): 집계 생략
    RETURN v_count;
  END IF;

  -- 키 길이 제한 (남용 방지)
  IF char_length(v_key) > 80 THEN
    v_key := left(v_key, 80);
  END IF;

  SELECT d.last_counted_at
  INTO v_last
  FROM public.question_view_dedup d
  WHERE d.question_id = p_question_id
    AND d.viewer_key = v_key
  FOR UPDATE;

  IF FOUND AND v_last >= NOW() - INTERVAL '5 minutes' THEN
    RETURN v_count;
  END IF;

  INSERT INTO public.question_view_dedup (question_id, viewer_key, last_counted_at)
  VALUES (p_question_id, v_key, NOW())
  ON CONFLICT (question_id, viewer_key)
  DO UPDATE SET last_counted_at = NOW();

  UPDATE public.questions
  SET view_count = view_count + 1
  WHERE id = p_question_id
  RETURNING view_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.record_question_view(BIGINT, TEXT) IS
  '질문 조회수 +1. 작성자 제외, (질문,viewer_key) 5분 쿨다운';

REVOKE ALL ON FUNCTION public.record_question_view(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_question_view(BIGINT, TEXT) TO anon, authenticated;

-- 구 시그니처(인자 1개) 호환: 오버로드 유지
CREATE OR REPLACE FUNCTION public.record_question_view(p_question_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.record_question_view(p_question_id, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.record_question_view(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_question_view(BIGINT) TO anon, authenticated;
