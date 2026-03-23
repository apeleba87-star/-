import {
  buildListingBulkTemplateWorkbook,
  splitListingCategoryPool,
  type ListingBulkCategoryRow,
  type ListingRefRow,
} from "@/lib/admin/listing-bulk-excel";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/** 관리자: 현장거래 외부 퍼옴 대량 업로드 엑셀 (업로드양식 + 기준표 + 집계안내) */
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
    .select("id, name, slug, parent_id, sort_order, usage")
    .eq("is_active", true)
    .in("usage", ["listing", "default"])
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { pool, mains, subs } = splitListingCategoryPool((all ?? []) as ListingBulkCategoryRow[]);
  const mainById = new Map(mains.map((m) => [m.id, m.name]));

  const refRows: ListingRefRow[] = [];
  for (const m of [...mains].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    refRows.push({
      id: m.id,
      name: m.name,
      parent_name: "—",
      slug: m.slug ?? "",
      kind: "대분류",
    });
  }
  for (const s of [...subs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    refRows.push({
      id: s.id,
      name: s.name,
      parent_name: mainById.get(s.parent_id!) ?? "",
      slug: s.slug ?? "",
      kind: "소분류",
    });
  }

  const exampleMainId = mains[0]?.id ?? pool[0]?.id ?? "";
  const wb = buildListingBulkTemplateWorkbook(refRows, exampleMainId);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="listing_bulk_upload_template.xlsx"',
    },
  });
}
