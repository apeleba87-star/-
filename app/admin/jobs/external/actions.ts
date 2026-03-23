"use server";

import type { JobBulkParsedRow } from "@/lib/admin/job-bulk-excel";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateExternalJobPostInput = {
  title: string;
  region: string;
  district: string;
  work_date?: string | null;
  description?: string | null;
  contact_phone: string;
  status: "open" | "closed";
  category_main_id: string;
  category_sub_id?: string | null;
  pay_amount: number;
  pay_unit: "day" | "half_day" | "hour";
  source_url?: string | null;
  /** 원본 등록일 YYYY-MM-DD (엑셀·외부 퍼옴 집계용) */
  external_registered_at?: string | null;
  skill_level?: "expert" | "general";
  job_type_input?: string;
  normalized_job_type_key?: string | null;
  normalization_status?: "auto_mapped" | "manual_review" | "manual_mapped";
};

async function insertExternalJobPostWithClient(
  supabase: SupabaseClient,
  userId: string,
  input: CreateExternalJobPostInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: jobPost, error: insertJobError } = await supabase
    .from("job_posts")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      region: input.region.trim(),
      district: (input.district ?? "").trim(),
      work_date: input.work_date?.trim() || null,
      description: input.description?.trim() || null,
      contact_phone: input.contact_phone.trim(),
      status: input.status,
      is_external: true,
      source_url: input.source_url?.trim() || null,
      external_registered_at: input.external_registered_at?.trim() || null,
    })
    .select("id")
    .single();

  if (insertJobError || !jobPost) return { ok: false, error: insertJobError?.message ?? "글 저장 실패" };

  const filledCount = input.status === "closed" ? 1 : 0;
  const skill = input.skill_level === "expert" ? "expert" : "general";
  const normStatus = input.normalization_status ?? "manual_review";
  const { error: posError } = await supabase.from("job_post_positions").insert({
    job_post_id: jobPost.id,
    category_main_id: input.category_main_id,
    category_sub_id: input.category_sub_id ?? null,
    job_type_input: input.job_type_input?.trim() || "외부 퍼옴",
    normalization_status: normStatus,
    normalized_job_type_key: input.normalized_job_type_key ?? null,
    skill_level: skill,
    pay_amount: Number(input.pay_amount),
    pay_unit: input.pay_unit,
    required_count: 1,
    filled_count: filledCount,
    sort_order: 0,
  });

  if (posError) return { ok: false, error: `포지션 저장 실패: ${posError.message}` };

  return { ok: true, id: jobPost.id };
}

export async function createExternalJobPost(input: CreateExternalJobPostInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  if (!input.title?.trim()) return { ok: false, error: "제목을 입력하세요." };
  if (!input.region?.trim()) return { ok: false, error: "지역을 입력하세요." };
  if (!input.contact_phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };
  if (!input.category_main_id) return { ok: false, error: "카테고리를 선택하세요." };
  if (Number(input.pay_amount) <= 0) return { ok: false, error: "일당/금액을 입력하세요." };

  const result = await insertExternalJobPostWithClient(supabase, user.id, input);
  if (!result.ok) return result;

  revalidatePath("/jobs");
  revalidatePath("/admin/jobs/external");
  return { ok: true, id: result.id };
}

export type BulkCreateExternalJobRowFailure = { rowIndex: number; message: string };

/** 엑셀 파싱이 끝난 행만 넘기세요. 파싱 오류는 클라이언트에서 먼저 처리합니다. */
export async function bulkCreateExternalJobPosts(rows: JobBulkParsedRow[]): Promise<
  | { ok: true; inserted: number; failures: BulkCreateExternalJobRowFailure[] }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") return { ok: false, error: "권한이 없습니다." };

  const failures: BulkCreateExternalJobRowFailure[] = [];
  let inserted = 0;

  for (const row of rows) {
    const input: CreateExternalJobPostInput = {
      title: row.title,
      region: row.region,
      district: row.district,
      work_date: row.work_date,
      description: row.description,
      contact_phone: row.contact_phone,
      status: row.status,
      category_main_id: row.category_main_id,
      category_sub_id: row.category_sub_id,
      pay_amount: row.pay_amount,
      pay_unit: row.pay_unit,
      source_url: row.source_url,
      external_registered_at: row.external_registered_at,
      skill_level: row.skill_level,
      job_type_input: row.position_job_type_input,
      normalized_job_type_key: row.normalized_job_type_key,
      normalization_status: row.normalization_status,
    };
    const result = await insertExternalJobPostWithClient(supabase, user.id, input);
    if (result.ok) inserted++;
    else failures.push({ rowIndex: row.rowIndex, message: result.error });
  }

  if (inserted > 0) {
    revalidatePath("/jobs");
    revalidatePath("/admin/jobs/external");
  }

  return { ok: true, inserted, failures };
}
