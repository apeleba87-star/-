import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-server";

/**
 * 현장거래: 등록일(created_at) 기준 2주(14일) 경과한 open 글을 자동 마감(closed) 처리.
 * 매일 1회 크론으로 호출 권장.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffIso = cutoff.toISOString();

  const { data: toClose, error: selectError } = await supabase
    .from("listings")
    .select("id")
    .eq("status", "open")
    .lt("created_at", cutoffIso);

  if (selectError) {
    return NextResponse.json(
      { ok: false, error: selectError.message },
      { status: 500 }
    );
  }

  const ids = (toClose ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({
      ok: true,
      closed: 0,
      message: "2주 경과 현장거래 없음",
    });
  }

  const { error: updateError } = await supabase
    .from("listings")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    closed: ids.length,
    message: `2주 경과 현장거래 ${ids.length}건 마감 처리됨`,
  });
}
