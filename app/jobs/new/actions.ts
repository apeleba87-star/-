"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { PositionInput } from "@/lib/jobs/types";

type CreateJobPostInput = {
  title: string;
  region: string;
  district: string;
  work_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  contact_phone: string;
  positions: PositionInput[];
};

export async function createJobPost(input: CreateJobPostInput) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input.title?.trim()) return { ok: false, error: "제목을 입력하세요." };
  if (!input.region?.trim()) return { ok: false, error: "지역을 선택하세요." };
  if (!input.contact_phone?.trim()) return { ok: false, error: "연락처를 입력하세요." };
  if (!input.positions?.length) return { ok: false, error: "모집 포지션을 1개 이상 추가하세요." };

  const { data: jobPost, error: insertJobError } = await supabase
    .from("job_posts")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      region: input.region.trim(),
      district: (input.district ?? "").trim(),
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

  for (let i = 0; i < input.positions.length; i++) {
    const p = input.positions[i];
    if (!p.category_main_id) return { ok: false, error: `${i + 1}번째 포지션의 대분류를 선택하세요.` };
    if (Number(p.pay_amount) <= 0) return { ok: false, error: `${i + 1}번째 포지션의 금액을 입력하세요.` };
    const reqCount = Math.max(1, Math.floor(Number(p.required_count) || 1));

    const { error: posError } = await supabase.from("job_post_positions").insert({
      job_post_id: jobPost.id,
      category_main_id: p.category_main_id,
      category_sub_id: p.category_sub_id || null,
      custom_subcategory_text: p.custom_subcategory_text?.trim() || null,
      pay_amount: Number(p.pay_amount),
      pay_unit: p.pay_unit,
      required_count: reqCount,
      filled_count: 0,
      work_scope: p.work_scope?.trim() || null,
      notes: p.notes?.trim() || null,
      status: "open",
      sort_order: i,
    });

    if (posError) return { ok: false, error: `포지션 저장 실패: ${posError.message}` };
  }

  revalidatePath("/jobs");
  return { ok: true, id: jobPost.id };
}
