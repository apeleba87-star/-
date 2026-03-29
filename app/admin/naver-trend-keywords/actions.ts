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

function parseCommaSeparatedList(raw: string): string[] {
  return raw.split(/[,，;；\n\r]+/).map((s) => s.trim()).filter(Boolean);
}

function parseSubKeywords(raw: string): string[] {
  return parseCommaSeparatedList(raw);
}

function parseSizeKeywords(raw: string): string[] {
  return parseCommaSeparatedList(raw);
}

function parseTitleTemplates(raw: string): string[] {
  return raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

export async function addNaverTrendKeywordGroup(
  groupName: string,
  mainKeywordRaw: string,
  subsRaw: string,
  sizesRaw: string,
  templatesRaw: string,
  sortOrder: number
) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const name = groupName.trim();
  if (!name) return { ok: false, error: "주제어(그룹명)를 입력하세요." };

  const mainFromField = mainKeywordRaw.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean)[0];
  const main = (mainFromField || name).trim();
  if (!main) return { ok: false, error: "메인 키워드를 입력하거나 주제어를 채우세요." };

  const sub_keywords = parseSubKeywords(subsRaw);
  const size_keywords = parseSizeKeywords(sizesRaw);
  const title_templates = parseTitleTemplates(templatesRaw);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("naver_trend_keyword_groups")
    .insert({
      group_name: name,
      keywords: [main],
      sub_keywords,
      size_keywords,
      title_templates,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("id, group_name, keywords, sort_order, is_active, sub_keywords, size_keywords, title_templates")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/naver-trend-keywords");
  return { ok: true, row: data };
}

export async function updateNaverTrendKeywordGroup(
  id: string,
  updates: {
    group_name?: string;
    keywords?: string[];
    sub_keywords?: string[];
    size_keywords?: string[];
    title_templates?: string[];
    sort_order?: number;
    is_active?: boolean;
  }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("naver_trend_keyword_groups").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/naver-trend-keywords");
  return { ok: true };
}

export type BulkNaverTrendRowInput = {
  group_name: string;
  keywords: string[];
  sub_keywords?: string[];
  size_keywords?: string[];
  title_templates?: string[];
  sort_order: number;
  is_active: boolean;
};

const BULK_IMPORT_MAX = 300;

/** 엑셀에서 파싱한 행을 일괄 insert (관리자 전용) */
export async function bulkImportNaverTrendKeywordGroups(rows: BulkNaverTrendRowInput[]) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false as const, error: auth.error };

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false as const, error: "등록할 행이 없습니다." };
  }
  if (rows.length > BULK_IMPORT_MAX) {
    return { ok: false as const, error: `한 번에 최대 ${BULK_IMPORT_MAX}행까지 등록할 수 있습니다.` };
  }

  const payloads: {
    group_name: string;
    keywords: string[];
    sub_keywords: string[];
    size_keywords: string[];
    title_templates: string[];
    sort_order: number;
    is_active: boolean;
  }[] = [];

  const lineErrors: string[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const line = i + 2;
    const name = (r.group_name ?? "").trim();
    const kws = Array.isArray(r.keywords) ? r.keywords.map((k) => String(k).trim()).filter(Boolean) : [];
    if (!name) {
      lineErrors.push(`${line}행: 주제어(그룹명)가 비어 있습니다.`);
      continue;
    }
    if (kws.length < 1) {
      lineErrors.push(`${line}행「${name}」: 메인 키워드가 없습니다.`);
      continue;
    }
    if (kws.length > 1) {
      lineErrors.push(`${line}행「${name}」: 메인은 1개만 사용합니다. 첫 값만 저장합니다.`);
    }
    const main = kws[0]!;
    const sub_keywords = Array.isArray(r.sub_keywords)
      ? r.sub_keywords.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const size_keywords = Array.isArray(r.size_keywords)
      ? r.size_keywords.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const title_templates = Array.isArray(r.title_templates)
      ? r.title_templates.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const sortOrder = Number.isFinite(Number(r.sort_order)) ? Math.floor(Number(r.sort_order)) : 0;
    payloads.push({
      group_name: name,
      keywords: [main],
      sub_keywords,
      size_keywords,
      title_templates,
      sort_order: sortOrder,
      is_active: r.is_active !== false,
    });
  }

  if (payloads.length === 0) {
    return { ok: false as const, error: lineErrors.join("\n") || "유효한 행이 없습니다." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("naver_trend_keyword_groups")
    .insert(payloads)
    .select("id, group_name, keywords, sort_order, is_active, sub_keywords, size_keywords, title_templates");

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/naver-trend-keywords");
  revalidatePath("/marketing-report");
  return {
    ok: true as const,
    inserted: data?.length ?? 0,
    rows: data ?? [],
    warnings: lineErrors.length > 0 ? lineErrors : undefined,
  };
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
