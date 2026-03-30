import {
  buildJobBulkTemplateWorkbook,
  type JobBulkCategoryRow,
  type JobBulkTemplateSubRow,
  splitJobMainAndSubCategories,
} from "@/lib/admin/job-bulk-excel";
import { syncJobTypePresetWithSubcategory } from "@/lib/jobs/ensure-preset-linked-subcategory";
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

  let all: JobBulkCategoryRow[] = [];
  {
    const { data, error: catErr } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .eq("is_active", true)
      .in("usage", ["job", "default"])
      .order("sort_order", { ascending: true });
    if (catErr) {
      return NextResponse.json({ error: catErr.message }, { status: 500 });
    }
    all = data ?? [];
  }

  const { data: presetRowsDb, error: presetErr } = await supabase
    .from("job_type_presets")
    .select("id, key, label, category_sub_id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (presetErr) {
    return NextResponse.json({ error: presetErr.message }, { status: 500 });
  }

  let presetList = presetRowsDb ?? [];
  let didLink = false;
  for (const p of presetList) {
    if (!String(p.category_sub_id ?? "").trim()) {
      const res = await syncJobTypePresetWithSubcategory(supabase, p.id as string, String(p.label ?? ""));
      if ("error" in res) {
        return NextResponse.json({ error: res.error }, { status: 500 });
      }
      didLink = true;
    }
  }

  if (didLink) {
    const { data: again, error: catErr2 } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .eq("is_active", true)
      .in("usage", ["job", "default"])
      .order("sort_order", { ascending: true });
    if (catErr2) {
      return NextResponse.json({ error: catErr2.message }, { status: 500 });
    }
    all = again ?? [];
    const { data: presetsAgain, error: pe2 } = await supabase
      .from("job_type_presets")
      .select("id, key, label, category_sub_id, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (pe2) {
      return NextResponse.json({ error: pe2.message }, { status: 500 });
    }
    presetList = presetsAgain ?? [];
  }

  const { mains, subs } = splitJobMainAndSubCategories(all ?? []);
  const mainById = new Map(mains.map((m) => [m.id, m.name]));
  const subById = new Map(subs.map((s) => [s.id, s]));

  /** 구인 화면(job_type_presets)과 동일한 업종만 기준표에 표시 */
  const presetRows: JobBulkTemplateSubRow[] = presetList.map((p) => {
    const sid = String(p.category_sub_id ?? "").trim();
    const sub = sid ? subById.get(sid) : undefined;
    return {
      id: sid,
      parent_id: sub?.parent_id ?? "",
      name: sub?.name ?? "",
      slug: sub?.slug ?? null,
      sort_order: sub?.sort_order ?? null,
      parent_name: sub ? (mainById.get(sub.parent_id) ?? "") : "",
      screen_label: String(p.label ?? ""),
      preset_key: String(p.key ?? ""),
      missing_in_db: !sub,
    };
  });
  const wb = buildJobBulkTemplateWorkbook(presetRows);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="job_bulk_upload_template.xlsx"',
    },
  });
}
