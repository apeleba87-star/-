-- 질문 조회수

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.questions.view_count IS '질문 상세 조회수';

CREATE OR REPLACE FUNCTION public.record_question_view(p_question_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.questions
  SET view_count = view_count + 1
  WHERE id = p_question_id
    AND status = 'published'
    AND deleted_at IS NULL
  RETURNING view_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_question_view(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_question_view(BIGINT) TO anon, authenticated;
