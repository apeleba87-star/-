"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { runBackfillCleanScore } from "@/lib/g2b/backfill-clean-score";

export async function addTenderKeyword(
  keyword: string,
  keyword_type: "include" | "exclude",
  sort_order: number,
  category?: "cleaning" | "disinfection" | null
) {
  const supabase = await createServerSupabase();
  const payload: Record<string, unknown> = {
    keyword: keyword.trim(),
    keyword_type,
    sort_order,
    enabled: true,
    category: keyword_type === "exclude" ? null : category ?? "cleaning",
  };
  const { data, error } = await supabase
    .from("tender_keywords")
    .insert(payload)
    .select("id, keyword, keyword_type, category, sort_order, enabled")
    .single();

  if (error) return { ok: false, error: error.message, row: null };
  revalidatePath("/admin/tender-keywords");
  return { ok: true, row: data };
}

export async function updateTenderKeyword(
  id: string,
  updates: { enabled?: boolean; keyword_type?: "include" | "exclude"; sort_order?: number; category?: "cleaning" | "disinfection" | null }
) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("tender_keywords").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/tender-keywords");
  return { ok: true };
}

export async function deleteTenderKeyword(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("tender_keywords").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/tender-keywords");
  return { ok: true };
}

/** 기존 입찰 공고에 현재 키워드(포함/제외) 반영 — 제외 추가 후 청소년수련관 등 반영용 */
export async function runBackfillAction() {
  const result = await runBackfillCleanScore();
  revalidatePath("/admin/tender-keywords");
  revalidatePath("/tenders");
  revalidatePath("/tenders/dashboard");
  return result;
}
