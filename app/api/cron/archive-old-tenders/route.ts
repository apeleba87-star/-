import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const months = Number(new URL(req.url).searchParams.get("months") ?? "6");
  const safeMonths = Number.isFinite(months) && months >= 3 && months <= 12 ? Math.floor(months) : 6;

  const { data, error } = await supabase.rpc("archive_old_tenders", { p_older_than_months: safeMonths });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, archived: Number(data ?? 0), months: safeMonths });
}

