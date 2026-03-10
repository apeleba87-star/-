"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { slotsOverlap, type Slot } from "@/lib/jobs/conflict";

/** 포지션에 지원 */
export async function applyToPosition(positionId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: cap } = await supabase.from("member_capabilities").select("can_apply_jobs").eq("user_id", user.id).single();
  if (!cap?.can_apply_jobs) return { ok: false, error: "구직 지원 권한이 없습니다. 마이페이지에서 활동을 추가해 주세요." };

  const { data: worker } = await supabase
    .from("worker_profiles")
    .select("birth_year, gender")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasBirthYear = worker?.birth_year != null && worker.birth_year >= 1900 && worker.birth_year <= 2100;
  const hasGender = worker?.gender != null && worker.gender !== "";

  if (!hasBirthYear || !hasGender) {
    return {
      ok: false,
      error:
        "지원하려면 마이페이지에서 나이(출생년도)와 성별을 먼저 입력해 주세요. 잘못 입력된 정보로 인한 피해는 본인이 책임지셔야 합니다.",
    };
  }

  const { data: pos } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, required_count, status")
    .eq("id", positionId)
    .eq("job_post_id", jobPostId)
    .single();
  if (!pos) return { ok: false, error: "포지션을 찾을 수 없습니다." };
  if (pos.status === "closed") return { ok: false, error: "이미 마감된 포지션입니다." };

  const { data: existing } = await supabase
    .from("job_applications")
    .select("id, status")
    .eq("position_id", positionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    if (existing.status === "accepted") return { ok: false, error: "이미 확정된 지원입니다." };
    if (existing.status === "applied" || existing.status === "reviewing") return { ok: false, error: "이미 지원했습니다." };
  }

  const { error } = await supabase.from("job_applications").insert({
    position_id: positionId,
    user_id: user.id,
    status: "applied",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 지원 취소 (지원자만, 매칭 전에만) */
export async function cancelApplicationByWorker(applicationId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: app } = await supabase
    .from("job_applications")
    .select("id, user_id, status")
    .eq("id", applicationId)
    .single();
  if (!app || app.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };
  if (app.status === "accepted") return { ok: false, error: "확정된 지원은 취소할 수 없습니다. 업체와 협의 후 업체가 취소해 주세요." };

  const { error } = await supabase
    .from("job_applications")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 확정 (구인자) + 같은 날 겹치는 다른 확정 건 자동 취소 + 완료 원장 삽입 */
export async function confirmApplication(applicationId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("id, user_id, region, district, work_date, start_time, end_time").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { data: appRow } = await supabase.from("job_applications").select("id, position_id, user_id, status").eq("id", applicationId).single();
  if (!appRow) return { ok: false, error: "지원을 찾을 수 없습니다." };
  if (appRow.status !== "applied" && appRow.status !== "reviewing") return { ok: false, error: "이미 처리된 지원입니다." };

  const positionId = appRow.position_id;
  const workerId = appRow.user_id;

  const { data: pos } = await supabase
    .from("job_post_positions")
    .select("id, job_post_id, category_main_id, category_sub_id, pay_amount, pay_unit, normalized_daily_wage, work_period, start_time, end_time, skill_level, normalized_job_type_key")
    .eq("id", positionId)
    .single();
  if (!pos || pos.job_post_id !== jobPostId) return { ok: false, error: "포지션을 찾을 수 없습니다." };

  const { data: acceptedList } = await supabase
    .from("job_applications")
    .select("id")
    .eq("position_id", positionId)
    .eq("status", "accepted");
  const { data: posRequired } = await supabase.from("job_post_positions").select("required_count").eq("id", positionId).single();
  if (posRequired && (acceptedList?.length ?? 0) >= posRequired.required_count) return { ok: false, error: "이미 해당 포지션 모집이 마감되었습니다." };

  const workDate = post.work_date ? String(post.work_date).slice(0, 10) : null;
  const thisSlot: Slot = {
    work_date: workDate,
    start_time: pos.start_time ? String(pos.start_time).slice(0, 5) : (post.start_time ? String(post.start_time).slice(0, 5) : null),
    end_time: pos.end_time ? String(pos.end_time).slice(0, 5) : (post.end_time ? String(post.end_time).slice(0, 5) : null),
  };

  const { data: otherAccepted } = await supabase
    .from("job_applications")
    .select("id, position_id")
    .eq("user_id", workerId)
    .eq("status", "accepted")
    .neq("id", applicationId);

  const toCancel: string[] = [];
  if (otherAccepted?.length) {
    for (const o of otherAccepted) {
      const { data: oPos } = await supabase.from("job_post_positions").select("job_post_id, start_time, end_time").eq("id", o.position_id).single();
      if (!oPos?.job_post_id) continue;
      const { data: oPostRow } = await supabase.from("job_posts").select("work_date, start_time, end_time").eq("id", oPos.job_post_id).single();
      const oSlot: Slot = {
        work_date: oPostRow?.work_date ? String(oPostRow.work_date).slice(0, 10) : null,
        start_time: oPos?.start_time ? String(oPos.start_time).slice(0, 5) : (oPostRow?.start_time ? String(oPostRow.start_time).slice(0, 5) : null),
        end_time: oPos?.end_time ? String(oPos.end_time).slice(0, 5) : (oPostRow?.end_time ? String(oPostRow.end_time).slice(0, 5) : null),
      };
      if (slotsOverlap(thisSlot, oSlot)) toCancel.push(o.id);
    }
  }

  for (const id of toCancel) {
    await supabase.from("job_applications").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  }

  const { error: updateErr } = await supabase
    .from("job_applications")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (updateErr) return { ok: false, error: updateErr.message };

  const { error: insertErr } = await supabase.from("completed_job_assignments").insert({
    job_application_id: applicationId,
    position_id: positionId,
    job_post_id: jobPostId,
    worker_id: workerId,
    region: post.region,
    district: post.district ?? "",
    category_main_id: pos.category_main_id,
    category_sub_id: pos.category_sub_id ?? null,
    pay_unit: pos.pay_unit,
    pay_amount: pos.pay_amount,
    normalized_daily_wage: pos.normalized_daily_wage ?? null,
    work_date: post.work_date ?? null,
    skill_level: pos.skill_level ?? null,
    normalized_job_type_key: pos.normalized_job_type_key ?? null,
  });
  if (insertErr) return { ok: false, error: "완료 기록 저장 실패: " + insertErr.message };

  const { data: allPositions } = await supabase.from("job_post_positions").select("status").eq("job_post_id", jobPostId);
  const allClosed = (allPositions ?? []).every((p) => p.status === "closed");
  if (allClosed) {
    await supabase.from("job_posts").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", jobPostId);
  }

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 확정 취소 (구인자) → 포지션 재오픈 */
export async function cancelApplicationByCompany(applicationId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { data: app } = await supabase
    .from("job_applications")
    .select("id, position_id, status")
    .eq("id", applicationId)
    .single();
  if (!app) return { ok: false, error: "지원을 찾을 수 없습니다." };
  if (app.status !== "accepted") return { ok: false, error: "확정된 지원만 취소할 수 있습니다." };

  const { data: pos } = await supabase.from("job_post_positions").select("job_post_id").eq("id", app.position_id).single();
  if (!pos || pos.job_post_id !== jobPostId) return { ok: false, error: "포지션이 이 글에 속하지 않습니다." };

  await supabase.from("job_applications").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", applicationId);
  await supabase.from("completed_job_assignments").delete().eq("job_application_id", applicationId);

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 게시글 전체 마감 */
export async function closeJobPost(jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase
    .from("job_posts")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", jobPostId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}
