"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type CreateExternalJobPostInput = {
  title: string;
  region: string;
  district: string;
  work_date?: string | null;
  description?: string | null;
  contact_phone: string;
  status: "open" | "closed";
  category_main_id: string;
  pay_amount: number;
  pay_unit: "day" | "half_day" | "hour";
  source_url?: string | null;
};

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

  const { data: jobPost, error: insertJobError } = await supabase
    .from("job_posts")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      region: input.region.trim(),
      district: (input.district ?? "").trim(),
      work_date: input.work_date?.trim() || null,
      description: input.description?.trim() || null,
      contact_phone: input.contact_phone.trim(),
      status: input.status,
      is_external: true,
      source_url: input.source_url?.trim() || null,
    })
    .select("id")
    .single();

  if (insertJobError || !jobPost) return { ok: false, error: insertJobError?.message ?? "글 저장 실패" };

  const filledCount = input.status === "closed" ? 1 : 0;
  const { error: posError } = await supabase.from("job_post_positions").insert({
    job_post_id: jobPost.id,
    category_main_id: input.category_main_id,
    category_sub_id: null,
    job_type_input: "외부 퍼옴",
    normalization_status: "manual_review",
    skill_level: "general",
    pay_amount: Number(input.pay_amount),
    pay_unit: input.pay_unit,
    required_count: 1,
    filled_count: filledCount,
    sort_order: 0,
  });

  if (posError) return { ok: false, error: `포지션 저장 실패: ${posError.message}` };

  revalidatePath("/jobs");
  revalidatePath("/admin/jobs/external");
  return { ok: true, id: jobPost.id };
}
