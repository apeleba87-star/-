import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCleanidexContext } from "@/lib/cleanidex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const context = await getCleanidexContext();
  if (!context) return NextResponse.json({ ok: false, error: "cleanidex_membership_required" }, { status: 403 });

  const limit = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get("limit") ?? 20)));
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0));
  const filter = req.nextUrl.searchParams.get("filter")?.trim() ?? "all";

  const supabase = await createServerSupabase();
  let query = supabase
    .schema("cleanidex")
    .from("client_confirmations")
    .select("id, work_session_id, opened_at, confirmed, confirmed_at, created_at, updated_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter === "opened_pending") {
    query = query.not("opened_at", "is", null).eq("confirmed", false);
  } else if (filter === "confirmed") {
    query = query.eq("confirmed", true);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const rows = data ?? [];
  const hasMore = rows.length === limit;
  return NextResponse.json({
    ok: true,
    data: rows,
    pagination: {
      limit,
      offset,
      next_offset: hasMore ? offset + rows.length : null,
      has_more: hasMore,
    },
  });
}
