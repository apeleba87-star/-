"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import { runNaverTrendReportJob } from "@/lib/naver/trend-report";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인 필요" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한 없음" };
  }
  return { ok: true as const };
}

export async function addNaverTrendKeywordGroup(groupName: string, keywordsRaw: string, sortOrder: number) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parts = keywordsRaw
    .split(/[,，\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 1) return { ok: false, error: "키워드를 1개 이상 입력하세요." };
  if (parts.length > 20) return { ok: false, error: "그룹당 키워드는 최대 20개입니다." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("naver_trend_keyword_groups")
    .insert({
      group_name: groupName.trim(),
      keywords: parts,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("id, group_name, keywords, sort_order, is_active")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/naver-trend-keywords");
  return { ok: true, row: data };
}

export async function updateNaverTrendKeywordGroup(
  id: string,
  updates: { group_name?: string; keywords?: string[]; sort_order?: number; is_active?: boolean }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("naver_trend_keyword_groups").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/naver-trend-keywords");
  return { ok: true };
}

export async function deleteNaverTrendKeywordGroup(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("naver_trend_keyword_groups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/naver-trend-keywords");
  revalidatePath("/marketing-report");
  return { ok: true };
}

/** 관리자 수동 실행: service role로 스냅샷·리포트 갱신 */
export async function runNaverTrendReportManual() {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const supabase = createServiceSupabase();
    const result = await runNaverTrendReportJob(supabase);
    revalidatePath("/admin/naver-trend-keywords");
    revalidatePath("/marketing-report");
    if (result.report_date) {
      revalidatePath(`/marketing-report/${result.report_date}`);
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
