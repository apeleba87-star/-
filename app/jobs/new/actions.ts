"use server";

import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { PositionInput } from "@/lib/jobs/types";
import { resolveJobType } from "@/lib/jobs/resolve-job-type";
import { getKstTodayString } from "@/lib/jobs/kst-date";

type PrivateDetailsInput = {
  full_address?: string | null;
  contact_phone?: string | null;
  access_instructions?: string | null;
  parking_info?: string | null;
  notes?: string | null;
};

type CreateJobPostInput = {
  title: string;
  region: string;
  district: string;
  address?: string | null;
  work_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  contact_phone: string;
  private_details?: PrivateDetailsInput | null;
  positions: PositionInput[];
};

export async function createJobPost(input: CreateJobPostInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: cap } = await supabase.from("member_capabilities").select("can_post_jobs").eq("user_id", user.id).single();
  if (!cap?.can_post_jobs) return { ok: false, error: "구인글 작성 권한이 없습니다. 마이페이지에서 활동을 추가해 주세요." };

  if (!input.title?.trim()) return { ok: false, error: "제목을 입력하세요." };
  if (!input.region?.trim()) return { ok: false, error: "지역을 선택하세요." };
  if (!input.contact_phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };
  if (!input.positions?.length) return { ok: false, error: "모집 포지션을 1개 이상 추가하세요." };
  const todayKst = getKstTodayString();
  if (input.work_date?.trim() && input.work_date.trim() < todayKst) {
    return { ok: false, error: "근무일은 오늘 이후로 선택해 주세요." };
  }

  const now = Date.now();
  const oneMinAgo = new Date(now - 60 * 1000).toISOString();
  const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const { count: count1 } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneMinAgo);
  if ((count1 ?? 0) >= 3) {
    return { ok: false, error: "1분에 구인글은 3개까지 등록할 수 있습니다. 잠시 후 다시 시도해 주세요." };
  }
  const { count: count10 } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", tenMinAgo);
  if ((count10 ?? 0) >= 10) {
    return { ok: false, error: "10분 내 구인글은 10개까지 등록할 수 있습니다. 잠시 후 다시 시도해 주세요." };
  }

  const { data: mainCategories } = await supabase
    .from("categories")
    .select("id")
    .is("parent_id", null)
    .eq("is_active", true)
    .limit(1);
  const fallbackMainId = mainCategories?.[0]?.id;
  if (!fallbackMainId) return { ok: false, error: "카테고리가 없습니다. 관리자에게 문의하세요." };

  const { data: jobPost, error: insertJobError } = await supabase
    .from("job_posts")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      region: input.region.trim(),
      district: (input.district ?? "").trim(),
      address: input.address?.trim() || null,
      work_date: input.work_date?.trim() || null,
      start_time: input.start_time?.trim() || null,
      end_time: input.end_time?.trim() || null,
      description: input.description?.trim() || null,
      contact_phone: input.contact_phone.trim(),
      status: "open",
    })
    .select("id")
    .single();

  if (insertJobError || !jobPost) return { ok: false, error: insertJobError?.message ?? "글 저장 실패" };

  const priv = input.private_details;
  if (priv && (priv.full_address ?? priv.access_instructions ?? priv.parking_info ?? priv.notes ?? priv.contact_phone)) {
    await supabase.from("job_post_private_details").upsert(
      {
        job_post_id: jobPost.id,
        full_address: priv.full_address?.trim() || null,
        contact_phone: priv.contact_phone?.trim() || input.contact_phone.trim() || null,
        access_instructions: priv.access_instructions?.trim() || null,
        parking_info: priv.parking_info?.trim() || null,
        notes: priv.notes?.trim() || null,
      },
      { onConflict: "job_post_id" }
    );
  }

  const FAKE_PAY_DAILY_LIMIT = 2_000_000;
  for (let i = 0; i < input.positions.length; i++) {
    const p = input.positions[i];
    const jobTypeInput = (p.job_type_input ?? "").trim();
    if (!jobTypeInput) return { ok: false, error: `${i + 1}번째 포지션의 작업 종류를 선택하거나 입력하세요.` };
    if (Number(p.pay_amount) <= 0) return { ok: false, error: `${i + 1}번째 포지션의 금액을 입력하세요.` };
    if (p.pay_unit === "day" && Number(p.pay_amount) >= FAKE_PAY_DAILY_LIMIT) {
      return { ok: false, error: "일당 200만원 이상은 허위 금액으로 등록할 수 없습니다." };
    }
    const skillLevel = p.skill_level === "expert" || p.skill_level === "general" ? p.skill_level : "general";

    const resolved = await resolveJobType(supabase, p.job_type_key ?? null, jobTypeInput || undefined, fallbackMainId);

    const { error: posError } = await supabase.from("job_post_positions").insert({
      job_post_id: jobPost.id,
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
      filled_count: 0,
      work_scope: p.work_scope?.trim() || null,
      notes: p.notes?.trim() || null,
      work_period: p.pay_unit === "half_day" ? (p.work_period ?? null) : null,
      start_time: p.start_time?.trim() || null,
      end_time: p.end_time?.trim() || null,
      status: "open",
      sort_order: i,
    });

    if (posError) return { ok: false, error: `포지션 저장 실패: ${posError.message}` };
  }

  try {
    const service = createServiceSupabase();
    await service.rpc("refresh_job_post_stats");
  } catch {
    // 서비스 키 미설정 등으로 실패해도 구인 등록은 완료. 크론에서 갱신됨.
  }
  revalidatePath("/jobs");
  revalidatePath("/");
  return { ok: true, id: jobPost.id };
}
