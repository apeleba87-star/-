import {
  buildJobBulkTemplateWorkbook,
  buildJobTemplateCategorySheetRows,
  splitJobMainAndSubCategories,
} from "@/lib/admin/job-bulk-excel";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/** 관리자: 인력구인 대량 업로드용 엑셀 템플릿 (업로드양식 + 청소업종기준표=소분류) */
export async function GET() {
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

  const { data: all, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { mains, subs } = splitJobMainAndSubCategories(all ?? []);
  const mainById = new Map(mains.map((m) => [m.id, m.name]));

  /** 프리셋 순 + DB에만 있는 소분류까지 기준표에 포함(추가 업종 반영) */
  const { presetRows, dbExtraRows } = buildJobTemplateCategorySheetRows(subs, mains, mainById);
  const wb = buildJobBulkTemplateWorkbook(presetRows, dbExtraRows);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="job_bulk_upload_template.xlsx"',
    },
  });
}
