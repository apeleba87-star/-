-- 확정(confirm) 트랜잭션 RPC: 동시성 안전 + 겹치는 다른 확정 건 자동 취소
-- 1) 포지션 락 후 정원 체크 2) 지원 → accepted 3) completed_job_assignments 삽입
-- 4) 같은 지원자의 겹치는 시간대 다른 확정 건 취소 5) 전 포지션 마감 시 글 closed

CREATE OR REPLACE FUNCTION public.slots_overlap_ts(
  d1 DATE, t1s TIME, t1e TIME,
  d2 DATE, t2s TIME, t2e TIME
)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  a_start TIMESTAMPTZ;
  a_end   TIMESTAMPTZ;
  b_start TIMESTAMPTZ;
  b_end   TIMESTAMPTZ;
BEGIN
  IF d1 IS NULL OR d2 IS NULL THEN
    RETURN false;
  END IF;
  t1s := COALESCE(t1s, '00:00'::TIME);
  t1e := COALESCE(t1e, '23:59'::TIME);
  t2s := COALESCE(t2s, '00:00'::TIME);
  t2e := COALESCE(t2e, '23:59'::TIME);

  a_start := (d1 + t1s)::TIMESTAMPTZ;
  IF t1e < t1s OR t1e = t1s THEN
    a_end := (d1 + interval '1 day' + t1e)::TIMESTAMPTZ;
  ELSE
    a_end := (d1 + t1e)::TIMESTAMPTZ;
  END IF;

  b_start := (d2 + t2s)::TIMESTAMPTZ;
  IF t2e < t2s OR t2e = t2s THEN
    b_end := (d2 + interval '1 day' + t2e)::TIMESTAMPTZ;
  ELSE
    b_end := (d2 + t2e)::TIMESTAMPTZ;
  END IF;

  RETURN (a_start < b_end AND b_start < a_end);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_application(
  p_application_id UUID,
  p_job_post_id UUID,
  p_owner_user_id UUID
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post      RECORD;
  v_app       RECORD;
  v_pos       RECORD;
  v_accepted  INT;
  v_other     RECORD;
  v_o_pos     RECORD;
  v_o_post    RECORD;
  v_this_d    DATE;
  v_this_ts   TIME;
  v_this_te   TIME;
  v_all_closed boolean;
BEGIN
  -- 1) 글 소유자 확인
  SELECT id, user_id, region, district, work_date, start_time, end_time
    INTO v_post
    FROM job_posts
   WHERE id = p_job_post_id AND user_id = p_owner_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '권한이 없습니다.');
  END IF;

  -- 2) 지원서 조회
  SELECT id, position_id, user_id, status
    INTO v_app
    FROM job_applications
   WHERE id = p_application_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '지원을 찾을 수 없습니다.');
  END IF;
  IF v_app.position_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '포지션을 찾을 수 없습니다.');
  END IF;
  IF v_app.status NOT IN ('applied', 'reviewing') THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 처리된 지원입니다.');
  END IF;

  -- 3) 포지션 락 및 정원 체크
  SELECT id, job_post_id, category_main_id, category_sub_id, pay_amount, pay_unit,
         normalized_daily_wage, work_period, start_time, end_time, skill_level,
         normalized_job_type_key, required_count
    INTO v_pos
    FROM job_post_positions
   WHERE id = v_app.position_id AND job_post_id = p_job_post_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '포지션을 찾을 수 없습니다.');
  END IF;

  SELECT COUNT(*)::INT INTO v_accepted
    FROM job_applications
   WHERE position_id = v_app.position_id AND status = 'accepted';
  IF v_accepted >= v_pos.required_count THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 해당 포지션 모집이 마감되었습니다.');
  END IF;

  -- 4) 지원 → accepted
  UPDATE job_applications
     SET status = 'accepted', updated_at = NOW()
   WHERE id = p_application_id;

  -- 5) 완료 원장 삽입
  INSERT INTO completed_job_assignments (
    job_application_id, position_id, job_post_id, worker_id,
    region, district, category_main_id, category_sub_id,
    pay_unit, pay_amount, normalized_daily_wage, work_date,
    skill_level, normalized_job_type_key
  ) VALUES (
    p_application_id, v_app.position_id, p_job_post_id, v_app.user_id,
    v_post.region, COALESCE(v_post.district, ''),
    v_pos.category_main_id, v_pos.category_sub_id,
    v_pos.pay_unit, v_pos.pay_amount, v_pos.normalized_daily_wage,
    v_post.work_date, v_pos.skill_level, v_pos.normalized_job_type_key
  );

  -- 이 포지션 슬롯 (겹침 체크용)
  v_this_d  := v_post.work_date;
  v_this_ts := COALESCE(v_pos.start_time, v_post.start_time);
  v_this_te := COALESCE(v_pos.end_time, v_post.end_time);

  -- 6) 같은 지원자의 다른 확정 건 중 시간 겹치는 것 취소
  FOR v_other IN
    SELECT a.id AS app_id, a.position_id
      FROM job_applications a
     WHERE a.user_id = v_app.user_id
       AND a.status = 'accepted'
       AND a.id <> p_application_id
  LOOP
    SELECT p.job_post_id, p.start_time, p.end_time
      INTO v_o_pos
      FROM job_post_positions p
     WHERE p.id = v_other.position_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT j.work_date, j.start_time, j.end_time
      INTO v_o_post
      FROM job_posts j
     WHERE j.id = v_o_pos.job_post_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    IF public.slots_overlap_ts(
      v_this_d, v_this_ts, v_this_te,
      v_o_post.work_date, COALESCE(v_o_pos.start_time, v_o_post.start_time), COALESCE(v_o_pos.end_time, v_o_post.end_time)
    ) THEN
      UPDATE job_applications SET status = 'cancelled', updated_at = NOW() WHERE id = v_other.app_id;
      DELETE FROM completed_job_assignments WHERE job_application_id = v_other.app_id;
    END IF;
  END LOOP;

  -- 7) 전 포지션 마감 시 글 closed
  SELECT bool_and(p.status = 'closed') INTO v_all_closed
    FROM job_post_positions p
   WHERE p.job_post_id = p_job_post_id;
  IF v_all_closed THEN
    UPDATE job_posts SET status = 'closed', updated_at = NOW() WHERE id = p_job_post_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.confirm_application(UUID, UUID, UUID) IS '지원 확정: 트랜잭션 내 락·정원 체크·완료 원장 삽입·겹치는 확정 취소·글 마감 처리';
