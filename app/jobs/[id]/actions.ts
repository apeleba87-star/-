"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import { resolveJobType } from "@/lib/jobs/resolve-job-type";
import type { PositionInput } from "@/lib/jobs/types";

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
    .select("nickname, birth_date, gender, contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasNickname = (worker?.nickname ?? "").trim() !== "";
  const hasBirthDate = worker?.birth_date != null && String(worker.birth_date).trim() !== "";
  const hasGender = worker?.gender === "M" || worker?.gender === "F";
  const hasContactPhone = (worker?.contact_phone ?? "").trim() !== "";

  if (!hasNickname || !hasBirthDate || !hasGender || !hasContactPhone) {
    return {
      ok: false,
      error:
        "지원하려면 이름·생년월일·성별·휴대폰 번호를 입력해 주세요. 구인글 상세에서 지원하기를 누르면 한 번만 입력하면 됩니다.",
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

function isValidBirthDate(value: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** 프로필 입력 후 지원 (이름·생년월일·성별·휴대폰 한 번만 입력하면 마이페이지에 저장되고 지원 완료) */
export async function applyWithProfile(
  positionId: string,
  jobPostId: string,
  profile: { nickname: string; birth_date: string; gender: "M" | "F"; contact_phone: string }
) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: cap } = await supabase.from("member_capabilities").select("can_apply_jobs").eq("user_id", user.id).single();
  if (!cap?.can_apply_jobs) return { ok: false, error: "구직 지원 권한이 없습니다. 마이페이지에서 활동을 추가해 주세요." };

  const nick = (profile.nickname ?? "").trim();
  const birthDate = (profile.birth_date ?? "").trim();
  const gender = profile.gender === "M" || profile.gender === "F" ? profile.gender : null;
  const phone = (profile.contact_phone ?? "").trim();

  if (!nick) return { ok: false, error: "이름을 입력해 주세요." };
  if (!birthDate || !isValidBirthDate(birthDate)) return { ok: false, error: "생년월일을 올바르게 입력해 주세요. (예: 1990-01-01)" };
  if (!gender) return { ok: false, error: "성별을 선택해 주세요." };
  if (!phone) return { ok: false, error: "휴대폰 번호를 입력해 주세요." };

  const { data: existingWorker } = await supabase
    .from("worker_profiles")
    .select("nickname")
    .eq("user_id", user.id)
    .maybeSingle();
  const keptNickname = (existingWorker?.nickname != null && String(existingWorker.nickname).trim() !== "")
    ? existingWorker.nickname
    : nick;

  const { error: upsertErr } = await supabase
    .from("worker_profiles")
    .upsert(
      {
        user_id: user.id,
        nickname: keptNickname,
        birth_date: birthDate,
        gender,
        contact_phone: phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (upsertErr) return { ok: false, error: upsertErr.message };

  revalidatePath("/mypage");
  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");

  return applyToPosition(positionId, jobPostId);
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

/** 확정 (구인자): 트랜잭션 RPC로 처리 (정원 체크·겹치는 확정 취소·원장 삽입·글 마감) */
export async function confirmApplication(applicationId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: result, error: rpcError } = await supabase.rpc("confirm_application", {
    p_application_id: applicationId,
    p_job_post_id: jobPostId,
    p_owner_user_id: user.id,
  });

  if (rpcError) return { ok: false, error: rpcError.message };
  const out = result as { ok?: boolean; error?: string } | null;
  if (!out?.ok) return { ok: false, error: out?.error ?? "확정 처리에 실패했습니다." };

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 확정 취소 (구인자) → 포지션 재오픈. 현장일이 지나면 불가(노쇼·신고는 별도 처리). */
export async function cancelApplicationByCompany(applicationId: string, jobPostId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id, work_date").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  if (post.work_date && post.work_date < getKstTodayString()) {
    return { ok: false, error: "현장일이 지나면 확정 취소할 수 없습니다. 노쇼·분쟁은 신고로 처리해 주세요." };
  }

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

const NO_SHOW_SUBTYPES = ["no_show_absent", "no_show_left", "no_show_other"] as const;
export type NoShowSubtype = (typeof NO_SHOW_SUBTYPES)[number];

/** 노쇼 신고 (구인자) → job_reports 삽입(사유 선택), 지원 상태를 no_show_reported 로 변경 */
export async function reportNoShow(
  applicationId: string,
  jobPostId: string,
  reasonSubtype: NoShowSubtype,
  reasonText?: string | null
) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!NO_SHOW_SUBTYPES.includes(reasonSubtype)) {
    return { ok: false, error: "유효한 노쇼 사유를 선택해 주세요." };
  }

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { data: app } = await supabase
    .from("job_applications")
    .select("id, position_id, user_id, status")
    .eq("id", applicationId)
    .single();
  if (!app) return { ok: false, error: "지원을 찾을 수 없습니다." };
  if (app.status === "no_show_reported") return { ok: false, error: "이미 노쇼 신고하셨습니다." };
  if (app.status !== "accepted") return { ok: false, error: "확정된 지원에 대해서만 노쇼 신고할 수 있습니다." };

  const { data: pos } = await supabase.from("job_post_positions").select("job_post_id").eq("id", app.position_id).single();
  if (!pos || pos.job_post_id !== jobPostId) return { ok: false, error: "포지션이 이 글에 속하지 않습니다." };

  const { data: existing } = await supabase
    .from("job_reports")
    .select("id")
    .eq("job_application_id", applicationId)
    .eq("reporter_id", user.id)
    .eq("reason_type", "no_show")
    .maybeSingle();
  if (existing) return { ok: false, error: "이미 노쇼 신고하셨습니다." };

  const now = Date.now();
  const oneMinAgo = new Date(now - 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const { count: count1 } = await supabase
    .from("job_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .eq("reason_type", "no_show")
    .gte("created_at", oneMinAgo);
  if ((count1 ?? 0) >= 5) {
    return { ok: false, error: "노쇼 신고는 1분에 5건까지 가능합니다. 잠시 후 다시 시도해 주세요." };
  }
  const { count: count24 } = await supabase
    .from("job_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .eq("reason_type", "no_show")
    .gte("created_at", oneDayAgo);
  if ((count24 ?? 0) >= 20) {
    return { ok: false, error: "노쇼 신고는 24시간에 20건까지 가능합니다. 과도한 신고는 관리자 검토 대상이 됩니다." };
  }

  const { error: insertErr } = await supabase.from("job_reports").insert({
    job_application_id: applicationId,
    reporter_id: user.id,
    reported_user_id: app.user_id,
    reason_type: "no_show",
    reason_subtype: reasonSubtype,
    reason_text: reasonText?.trim() || null,
  });
  if (insertErr) return { ok: false, error: insertErr.message };

  await supabase
    .from("job_applications")
    .update({ status: "no_show_reported", updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  await supabase.from("completed_job_assignments").delete().eq("job_application_id", applicationId);

  revalidatePath(`/jobs/${jobPostId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 구인글 수정 (본인만). job_posts + job_post_private_details + 기존 포지션 업데이트만(추가/삭제 없음). */
type UpdateJobPostPrivate = {
  full_address?: string | null;
  contact_phone?: string | null;
  access_instructions?: string | null;
  parking_info?: string | null;
  notes?: string | null;
};
type UpdateJobPostPosition = PositionInput & { id: string };
export async function updateJobPost(
  jobPostId: string,
  input: {
    title: string;
    region: string;
    district: string;
    address?: string | null;
    work_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    contact_phone: string;
    private_details?: UpdateJobPostPrivate | null;
    positions: UpdateJobPostPosition[];
  }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase.from("job_posts").select("user_id").eq("id", jobPostId).single();
  if (!post || post.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  if (!input.title?.trim()) return { ok: false, error: "제목을 입력하세요." };
  if (!input.region?.trim()) return { ok: false, error: "지역을 선택하세요." };
  if (!input.contact_phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };
  if (!input.positions?.length) return { ok: false, error: "모집 포지션을 1개 이상 두세요." };
  const todayKst = getKstTodayString();
  if (input.work_date?.trim() && input.work_date.trim() < todayKst) {
    return { ok: false, error: "근무일은 오늘 이후로 선택해 주세요." };
  }

  const { error: postErr } = await supabase
    .from("job_posts")
    .update({
      title: input.title.trim(),
      region: input.region.trim(),
      district: (input.district ?? "").trim(),
      address: input.address?.trim() || null,
      work_date: input.work_date?.trim() || null,
      start_time: input.start_time?.trim() || null,
      end_time: input.end_time?.trim() || null,
      description: input.description?.trim() || null,
      contact_phone: input.contact_phone.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobPostId);

  if (postErr) return { ok: false, error: postErr.message };

  const priv = input.private_details;
  if (priv) {
    await supabase.from("job_post_private_details").upsert(
      {
        job_post_id: jobPostId,
        full_address: priv.full_address?.trim() || null,
        contact_phone: priv.contact_phone?.trim() || input.contact_phone.trim() || null,
        access_instructions: priv.access_instructions?.trim() || null,
        parking_info: priv.parking_info?.trim() || null,
        notes: priv.notes?.trim() || null,
      },
      { onConflict: "job_post_id" }
    );
  }

  const { data: mainCategories } = await supabase.from("categories").select("id").is("parent_id", null).eq("is_active", true).in("usage", ["job", "default"]).limit(1);
  const fallbackMainId = mainCategories?.[0]?.id;
  if (!fallbackMainId) return { ok: false, error: "카테고리가 없습니다." };

  const FAKE_PAY_DAILY_LIMIT = 2_000_000;
  for (const p of input.positions) {
    const jobTypeInput = (p.job_type_input ?? "").trim();
    if (!jobTypeInput) return { ok: false, error: "모든 포지션의 작업 종류를 입력하세요." };
    if (Number(p.pay_amount) <= 0) return { ok: false, error: "모든 포지션의 금액을 입력하세요." };
    if (p.pay_unit === "day" && Number(p.pay_amount) >= FAKE_PAY_DAILY_LIMIT) {
      return { ok: false, error: "일당 200만원 이상은 허위 금액으로 등록할 수 없습니다." };
    }
    const skillLevel = p.skill_level === "expert" || p.skill_level === "general" ? p.skill_level : "general";

    const resolved = await resolveJobType(supabase, p.job_type_key ?? null, jobTypeInput || undefined, fallbackMainId);

    const { error: posErr } = await supabase
      .from("job_post_positions")
      .update({
        category_main_id: resolved.category_main_id,
        category_sub_id: resolved.category_sub_id,
        custom_subcategory_text: null,
        job_type_input: resolved.job_type_input,
        normalized_job_type_key: resolved.normalized_job_type_key,
        normalization_status: resolved.normalization_status,
        skill_level: skillLevel,
        pay_amount: Number(p.pay_amount),
        pay_unit: p.pay_unit,
        required_count: Math.max(1, Math.floor(Number(p.required_count) || 1)),
        work_scope: p.work_scope?.trim() || null,
        notes: p.notes?.trim() || null,
        work_period: p.pay_unit === "half_day" ? (p.work_period ?? null) : null,
        start_time: p.start_time?.trim() || null,
        end_time: p.end_time?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id)
      .eq("job_post_id", jobPostId);

    if (posErr) return { ok: false, error: `포지션 수정 실패: ${posErr.message}` };
  }

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

const MAX_APPEAL_TEXT_LENGTH = 500;

/** 노쇼 이의 제기 (구직자) — job_reports의 appealed_at, appeal_text만 업데이트 */
export async function submitNoShowAppeal(reportId: string, appealText: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: report } = await supabase
    .from("job_reports")
    .select("id, reported_user_id, status, appealed_at, job_application_id")
    .eq("id", reportId)
    .single();
  if (!report) return { ok: false, error: "해당 신고를 찾을 수 없습니다." };
  if (report.reported_user_id !== user.id) return { ok: false, error: "권한이 없습니다." };
  if (report.status !== "open") return { ok: false, error: "이미 처리된 신고입니다." };
  if (report.appealed_at) return { ok: false, error: "이미 이의 제기하셨습니다." };

  const text = (appealText ?? "").trim();
  if (text.length > MAX_APPEAL_TEXT_LENGTH) {
    return { ok: false, error: `이의 사유는 ${MAX_APPEAL_TEXT_LENGTH}자 이내로 입력해 주세요.` };
  }

  const { error } = await supabase
    .from("job_reports")
    .update({
      appealed_at: new Date().toISOString(),
      appeal_text: text || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return { ok: false, error: error.message };

  const { data: appRow } = await supabase
    .from("job_applications")
    .select("position_id")
    .eq("id", report.job_application_id)
    .single();
  const { data: posRow } =
    appRow
      ? await supabase.from("job_post_positions").select("job_post_id").eq("id", appRow.position_id).single()
      : { data: null };
  if (posRow?.job_post_id) revalidatePath(`/jobs/${posRow.job_post_id}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** 노쇼 취소(철회) — 관리자 전용. report → rescinded, application → accepted, completed_job_assignments 복구 */
export async function rescindNoShowReport(reportId: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";
  if (!isAdmin) return { ok: false, error: "권한이 없습니다." };

  const { data: report } = await supabase
    .from("job_reports")
    .select("id, job_application_id, status")
    .eq("id", reportId)
    .single();
  if (!report) return { ok: false, error: "해당 신고를 찾을 수 없습니다." };
  if (report.status !== "open") return { ok: false, error: "이미 처리된 신고입니다." };

  const applicationId = report.job_application_id;

  const { data: app } = await supabase
    .from("job_applications")
    .select("id, position_id, user_id")
    .eq("id", applicationId)
    .single();
  if (!app) return { ok: false, error: "지원 건을 찾을 수 없습니다." };

  const { data: pos } = await supabase
    .from("job_post_positions")
    .select("job_post_id, category_main_id, category_sub_id, pay_amount, pay_unit, normalized_daily_wage, skill_level, normalized_job_type_key")
    .eq("id", app.position_id)
    .single();
  if (!pos) return { ok: false, error: "포지션을 찾을 수 없습니다." };

  const { data: post } = await supabase
    .from("job_posts")
    .select("region, district, work_date")
    .eq("id", pos.job_post_id)
    .single();
  if (!post) return { ok: false, error: "구인글을 찾을 수 없습니다." };

  const { error: reportErr } = await supabase
    .from("job_reports")
    .update({
      status: "rescinded",
      rescinded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (reportErr) return { ok: false, error: reportErr.message };

  const { error: appErr } = await supabase
    .from("job_applications")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (appErr) return { ok: false, error: "지원 상태 복구 실패: " + appErr.message };

  const { error: insertErr } = await supabase.from("completed_job_assignments").insert({
    job_application_id: applicationId,
    position_id: app.position_id,
    job_post_id: pos.job_post_id,
    worker_id: app.user_id,
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
  if (insertErr) return { ok: false, error: "완료 기록 복구 실패: " + insertErr.message };

  revalidatePath("/jobs");
  revalidatePath("/admin/job-reports");
  return { ok: true };
}
