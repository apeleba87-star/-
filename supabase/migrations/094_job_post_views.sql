-- 구인 상세 조회수: (job_post_id, viewer_key=auth.uid)당 5분 쿨다운, 원자 처리 RPC

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS view_count bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.job_posts.view_count IS '구인 상세 조회 집계(타인 조회만, 5분 쿨다운)';

CREATE TABLE IF NOT EXISTS public.job_post_view_dedup (
  job_post_id uuid NOT NULL REFERENCES public.job_posts (id) ON DELETE CASCADE,
  viewer_key text NOT NULL,
  last_counted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_post_id, viewer_key)
);

CREATE INDEX IF NOT EXISTS idx_job_post_view_dedup_last_counted
  ON public.job_post_view_dedup (last_counted_at DESC);

COMMENT ON TABLE public.job_post_view_dedup IS '구인 조회수 중복 방지: (글, 시청자)별 마지막 집계 시각';

ALTER TABLE public.job_post_view_dedup ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_post_view_dedup FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.record_job_post_view(p_job_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_count bigint;
  v_last timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    SELECT COALESCE(jp.view_count, 0)
    INTO v_count
    FROM public.job_posts jp
    WHERE jp.id = p_job_post_id;
    RETURN jsonb_build_object(
      'incremented', false,
      'reason', 'not_authenticated',
      'view_count', COALESCE(v_count, 0)
    );
  END IF;

  SELECT jp.user_id, COALESCE(jp.view_count, 0)
  INTO v_owner, v_count
  FROM public.job_posts jp
  WHERE jp.id = p_job_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('incremented', false, 'reason', 'not_found', 'view_count', 0);
  END IF;

  IF v_owner = v_uid THEN
    RETURN jsonb_build_object('incremented', false, 'reason', 'owner', 'view_count', v_count);
  END IF;

  SELECT d.last_counted_at
  INTO v_last
  FROM public.job_post_view_dedup d
  WHERE d.job_post_id = p_job_post_id
    AND d.viewer_key = v_uid::text
  FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.job_post_view_dedup (job_post_id, viewer_key, last_counted_at)
      VALUES (p_job_post_id, v_uid::text, now());

      UPDATE public.job_posts jp
      SET
        view_count = jp.view_count + 1,
        updated_at = now()
      WHERE jp.id = p_job_post_id
      RETURNING jp.view_count INTO v_count;

      RETURN jsonb_build_object('incremented', true, 'reason', 'counted', 'view_count', v_count);
    EXCEPTION
      WHEN unique_violation THEN
        SELECT d2.last_counted_at
        INTO v_last
        FROM public.job_post_view_dedup d2
        WHERE d2.job_post_id = p_job_post_id
          AND d2.viewer_key = v_uid::text
        FOR UPDATE;
    END;
  END IF;

  IF v_last >= now() - interval '5 minutes' THEN
    SELECT COALESCE(jp.view_count, 0)
    INTO v_count
    FROM public.job_posts jp
    WHERE jp.id = p_job_post_id;

    RETURN jsonb_build_object('incremented', false, 'reason', 'cooldown', 'view_count', v_count);
  END IF;

  UPDATE public.job_post_view_dedup d
  SET last_counted_at = now()
  WHERE d.job_post_id = p_job_post_id
    AND d.viewer_key = v_uid::text;

  UPDATE public.job_posts jp
  SET
    view_count = jp.view_count + 1,
    updated_at = now()
  WHERE jp.id = p_job_post_id
  RETURNING jp.view_count INTO v_count;

  RETURN jsonb_build_object('incremented', true, 'reason', 'counted', 'view_count', v_count);
END;
$$;

COMMENT ON FUNCTION public.record_job_post_view(uuid) IS
  '구인 상세 조회 1회 집계. 본인 글 제외, (글, auth.uid)당 5분 쿨다운.';

REVOKE ALL ON FUNCTION public.record_job_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_job_post_view(uuid) TO authenticated;
