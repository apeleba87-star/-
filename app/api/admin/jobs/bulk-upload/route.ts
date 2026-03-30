import {
  buildJobBulkCategoryContext,
  parseJobBulkWorkbook,
  splitJobMainAndSubCategories,
} from "@/lib/admin/job-bulk-excel";
import { bulkCreateExternalJobPosts } from "@/app/admin/jobs/external/actions";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

/** 관리자: 엑셀 파일 업로드 → 파싱 후 외부 구인 일괄 등록 */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return NextResponse.json({ error: ".xlsx 또는 .xls 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "엑셀 파일을 읽을 수 없습니다." }, { status: 400 });
  }

  const { data: all, error: catErr } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .order("sort_order", { ascending: true });

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 });
  }

  const { mains, subs } = splitJobMainAndSubCategories(all ?? []);

  const { data: presetLinkRows, error: presetLinkErr } = await supabase
    .from("job_type_presets")
    .select("key, label, category_sub_id")
    .eq("is_active", true);
  if (presetLinkErr) {
    return NextResponse.json({ error: presetLinkErr.message }, { status: 500 });
  }
  const presetBySubId = new Map<string, { key: string; label: string }>();
  for (const pr of presetLinkRows ?? []) {
    const sid = String(pr.category_sub_id ?? "").trim().toLowerCase();
    if (!sid) continue;
    presetBySubId.set(sid, { key: String(pr.key ?? ""), label: String(pr.label ?? "") });
  }

  const ctx = buildJobBulkCategoryContext(mains, subs, presetBySubId);
  const { ok: validRows, errors: parseErrors } = parseJobBulkWorkbook(workbook, ctx);

  if (validRows.length === 0) {
    return NextResponse.json({
      inserted: 0,
      parseErrors,
      insertFailures: [] as { rowIndex: number; message: string }[],
      message:
        parseErrors.length > 0
          ? "유효한 데이터 행이 없습니다. 오류를 확인하세요."
          : "데이터 행이 없습니다. 예시 행을 지우고 실제 행을 채웠는지 확인하세요.",
    });
  }

  const bulk = await bulkCreateExternalJobPosts(validRows);
  if (!bulk.ok) {
    return NextResponse.json({ error: bulk.error, parseErrors }, { status: 500 });
  }

  return NextResponse.json({
    inserted: bulk.inserted,
    parseErrors,
    insertFailures: bulk.failures,
    message:
      bulk.failures.length === 0 && parseErrors.length === 0
        ? `${bulk.inserted}건 등록되었습니다.`
        : `등록 ${bulk.inserted}건. 파싱 제외/저장 실패는 아래 목록을 확인하세요.`,
  });
}
